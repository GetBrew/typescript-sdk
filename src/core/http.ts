import type {
  BrewFetch,
  BrewHttpMethod,
  BrewRawResponse,
  RequestOptions,
  ResolvedBrewClientConfig,
} from '../types'

import {
  BrewApiError,
  BrewConnectionError,
  BrewParseError,
  BrewTimeoutError,
  runtimeTimeoutCode,
} from './errors'
import { assertRetryCount, assertTimeoutMs } from './config'
import { buildHeaders } from './headers'
import { resolveIdempotencyKey } from './idempotency'
import { computeBackoff, type RetryCause, shouldRetry } from './retry'
import { buildUrl, type BuildUrlInput } from './url'

/**
 * Input to a single HTTP request. Everything the transport needs to know
 * about where to send the request, what to put in it, and how to behave on
 * failure.
 */
export type HttpRequestInput = {
  readonly method: BrewHttpMethod
  readonly path: string
  readonly pathParams?: BuildUrlInput['pathParams']
  readonly query?: BuildUrlInput['query']
  readonly body?: unknown
  readonly options?: RequestOptions
  /**
   * A long-running method's minimum per-attempt deadline. A FLOOR, never a
   * cap: a per-request `timeoutMs` always wins, and otherwise the attempt
   * gets the longer of this and the client's `timeoutMs` — so a method
   * default can raise a deadline the user configured but never shorten it.
   */
  readonly defaultTimeoutMs?: number
}

/**
 * Internal tuning for the transport. Not exposed on the public client
 * config — these only exist so tests can run the retry loop instantly and
 * assert on exact backoff values.
 *
 * In production every field defaults to a sensible value, so callers who
 * don't know about this type can ignore it entirely.
 */
export type HttpTuning = {
  readonly retryBaseMs?: number
  readonly retryMaxMs?: number
  readonly random?: () => number
  /**
   * Wait between attempts. The default honours `signal`, so a caller abort
   * ends a backoff at once; a test double may ignore it — the loop checks
   * the caller's signal again after every wait either way.
   */
  readonly sleep?: (input: {
    readonly ms: number
    readonly signal: AbortSignal | undefined
  }) => Promise<void>
}

export type HttpClient = {
  request<T>(input: HttpRequestInput): Promise<BrewRawResponse<T>>
}

const DEFAULT_RETRY_BASE_MS = 100
const DEFAULT_RETRY_MAX_MS = 10_000

/**
 * `setTimeout` — and so `AbortSignal.timeout` — cannot wait longer than
 * 2^31 − 1 ms; a larger delay fires almost immediately. Clamp to it, so a
 * huge (or `Infinity`) `timeoutMs` means "effectively none" rather than
 * "abort at once".
 */
const MAX_TIMER_MS = 2_147_483_647

/**
 * The code the Brew API answers a retry with while the FIRST attempt of the
 * same idempotency key is still running. After an attempt of our own ended
 * with an unknown outcome, that attempt is the one in progress.
 */
const IDEMPOTENCY_IN_PROGRESS = 'IDEMPOTENCY_IN_PROGRESS'

/**
 * Build an HTTP client bound to a resolved config. The returned client
 * holds the config + tuning in a closure, so resources only need to see
 * `{ request }` and never juggle config plumbing on their own.
 */
export function createHttpClient(
  config: ResolvedBrewClientConfig,
  tuning: HttpTuning = {}
): HttpClient {
  const retryBaseMs = tuning.retryBaseMs ?? DEFAULT_RETRY_BASE_MS
  const retryMaxMs = tuning.retryMaxMs ?? DEFAULT_RETRY_MAX_MS
  const random = tuning.random ?? Math.random
  const sleep = tuning.sleep ?? defaultSleep

  async function request<T>(
    input: HttpRequestInput
  ): Promise<BrewRawResponse<T>> {
    const options: RequestOptions = input.options ?? {}
    if (options.maxRetries !== undefined) {
      assertRetryCount({ value: options.maxRetries, name: 'maxRetries' })
    }
    if (options.timeoutMs !== undefined) {
      assertTimeoutMs({ value: options.timeoutMs, name: 'timeoutMs' })
    }
    const maxRetries = options.maxRetries ?? config.maxRetries
    const timeoutMs = normalizeTimeoutMs({
      timeoutMs:
        options.timeoutMs ??
        Math.max(config.timeoutMs, input.defaultTimeoutMs ?? 0),
    })
    const shouldRetryOnTimeout = options.retryOnTimeout ?? config.retryOnTimeout

    // Resolved ONCE, before the loop: every attempt of this call carries
    // the same key, which is what lets the server replay instead of
    // re-running a write whose first attempt had an unknown outcome.
    const idempotencyKey = resolveIdempotencyKey({
      method: input.method,
      provided: options.idempotencyKey,
    })
    const hasIdempotencyKey = idempotencyKey !== undefined
    const hasBody = input.body !== undefined

    const url = buildUrl({
      baseUrl: config.baseUrl,
      path: input.path,
      ...(input.pathParams ? { pathParams: input.pathParams } : {}),
      ...(input.query ? { query: input.query } : {}),
    })

    const headers = buildHeaders({
      apiKey: config.apiKey,
      ...(config.brandId !== undefined ? { brandId: config.brandId } : {}),
      userAgent: config.userAgent,
      hasBody,
      ...(idempotencyKey !== undefined ? { idempotencyKey } : {}),
    })

    const requestBody: string | null = hasBody
      ? JSON.stringify(input.body)
      : null

    // The request's own signal and the client-wide one both mean "the
    // caller wants this stopped". Combined once per call, released once.
    const caller = combineCallerSignals({
      signals: [options.signal, config.signal],
    })
    const callerSignal = caller.signal

    /* eslint-disable no-await-in-loop --
     * Sequential awaits inside the retry loop are intentional and the
     * entire reason the loop exists. Each iteration must:
     *   1. Wait for the attempt — headers AND body — to settle before
     *      deciding whether to retry.
     *   2. Release the discarded attempt's body before the next hop.
     *   3. Finish the backoff before starting again.
     * Parallelizing any of these would break correctness, so the
     * `no-await-in-loop` rule is disabled for the duration of this loop
     * with a real explanation rather than scattered line-disables.
     */
    try {
      let attempt = 0
      // The latest attempt that ended without an answer (timeout or
      // connection failure). If a retry then finds its key still in flight,
      // that attempt is what the server is working on.
      let unknownOutcome: UnknownOutcome | undefined

      while (attempt <= maxRetries) {
        const attemptSignal = createAttemptSignal({ timeoutMs, callerSignal })
        try {
          const result = await runAttempt<T>({
            fetchImpl: config.fetch,
            url,
            method: input.method,
            headers,
            body: requestBody,
            signal: attemptSignal.signal,
          })

          if (result.kind === 'success') return result.value

          const cause = classifyFailure({
            result,
            callerSignal,
            timeoutSignal: attemptSignal.timeoutSignal,
          })

          // A caller abort leaves before any retry policy runs. Rethrowing
          // the signal's `reason` verbatim is the web-platform contract:
          // `fetch` does the same, and callers compare against it.
          if (cause.kind === 'abort') {
            await cancelBody({
              response: responseOf({ result }),
              reason: callerSignal?.reason,
            })
            throwReason({ reason: callerSignal?.reason })
          }

          const isRetryable = shouldRetry({
            method: input.method,
            cause,
            attempt,
            maxRetries,
            hasIdempotencyKey,
            shouldRetryOnTimeout,
          })

          if (!isRetryable) {
            throw await toTerminalError({
              result,
              cause,
              attemptSignal: attemptSignal.signal,
              callerSignal,
              unknownOutcome,
              request: {
                method: input.method,
                url,
                timeoutMs,
                attempts: attempt + 1,
                idempotencyKey,
              },
            })
          }

          if (cause.kind === 'timeout' || cause.kind === 'connection') {
            unknownOutcome = {
              kind: cause.kind,
              error:
                result.kind === 'transport-failure' ? result.error : undefined,
            }
          }

          // EVERY retry path releases the discarded attempt's body before
          // the backoff. A retryable status was never read; a stream that
          // broke may belong to a custom fetch that never closed it. Left
          // alone, the server keeps streaming into a client that will never
          // read, until the Response happens to be garbage collected.
          //
          // Aborting the attempt's own signal is what reliably releases it:
          // the signal travels with the request, so the runtime tears the
          // connection down under every copy of the body. `body.cancel()`
          // alone cannot when a wrapper holds a `clone()` (a tee only
          // cancels its source once BOTH branches are cancelled); it stays
          // as the fallback for a custom fetch that ignores its signal.
          attemptSignal.discard()
          await cancelBody({ response: responseOf({ result }) })

          await sleep({
            ms: computeBackoff({
              attempt,
              baseMs: retryBaseMs,
              maxMs: retryMaxMs,
              ...(cause.kind === 'status' && cause.retryAfterMs !== undefined
                ? { retryAfterMs: cause.retryAfterMs }
                : {}),
              random,
            }),
            signal: callerSignal,
          })
          // The default sleep already rejects on abort; a sleep that ignores
          // the signal still must not start another attempt.
          if (callerSignal?.aborted === true) {
            throwReason({ reason: callerSignal.reason })
          }
        } finally {
          // Runs on every exit — success, throw, retry — and only AFTER the
          // body has been read. Releasing at headers-time is what let a
          // stalled body outlive its deadline and its cancel.
          attemptSignal.release()
        }
        attempt++
      }
    } finally {
      caller.release()
    }
    /* eslint-enable no-await-in-loop */

    // Unreachable: every iteration of the loop either returns or throws.
    throw new Error('http: retry loop exited without a result')
  }

  return { request }
}

/** What one attempt produced. */
type AttemptResult<T> =
  /** 2xx, body read to the end and parsed. */
  | { readonly kind: 'success'; readonly value: BrewRawResponse<T> }
  /**
   * No usable answer: `fetch` rejected (no `response`), or the headers
   * arrived and the body broke while streaming (`response` present).
   */
  | {
      readonly kind: 'transport-failure'
      readonly error: unknown
      readonly response: Response | undefined
    }
  /** 2xx, the whole body arrived, and it is not JSON. */
  | {
      readonly kind: 'parse-failure'
      readonly response: Response
      readonly error: unknown
      readonly text: string
    }
  /** Non-2xx. The body is left UNREAD: the loop reads it or releases it. */
  | { readonly kind: 'error-response'; readonly response: Response }

type AttemptFailure<T> = Exclude<AttemptResult<T>, { kind: 'success' }>

/** An earlier attempt of this call that ended without an answer. */
type UnknownOutcome = {
  readonly kind: 'timeout' | 'connection'
  readonly error: unknown
}

function responseOf<T>({
  result,
}: {
  readonly result: AttemptFailure<T>
}): Response | undefined {
  return result.response
}

async function runAttempt<T>({
  fetchImpl,
  url,
  method,
  headers,
  body,
  signal,
}: {
  readonly fetchImpl: BrewFetch
  readonly url: string
  readonly method: BrewHttpMethod
  readonly headers: Headers
  readonly body: string | null
  readonly signal: AbortSignal
}): Promise<AttemptResult<T>> {
  let response: Response
  try {
    response = await fetchImpl(url, { method, headers, body, signal })
  } catch (error) {
    return { kind: 'transport-failure', error, response: undefined }
  }

  if (!response.ok) {
    // Left unread on purpose: a retry throws the envelope away, so only the
    // terminal attempt pays to read it.
    return { kind: 'error-response', response }
  }

  let text: string
  try {
    text = await readTextWithin({ response, signal })
  } catch (error) {
    // The stream broke after the headers: a reset, the deadline, or a
    // caller abort. The same class of failure as a `fetch` reject, and it
    // gets the same classification and retry treatment.
    return { kind: 'transport-failure', error, response }
  }

  if (text === '') {
    return {
      kind: 'success',
      value: toRawResponse({ response, data: undefined as T }),
    }
  }

  let data: T
  try {
    data = JSON.parse(text) as T
  } catch (error) {
    return { kind: 'parse-failure', response, error, text }
  }
  return { kind: 'success', value: toRawResponse({ response, data }) }
}

function toRawResponse<T>({
  response,
  data,
}: {
  readonly response: Response
  readonly data: T
}): BrewRawResponse<T> {
  return {
    data,
    status: response.status,
    headers: response.headers,
    requestId: response.headers.get('x-request-id') ?? undefined,
  }
}

/**
 * WHY an attempt failed, decided by signal state — never by `error.name`.
 * A custom `fetch` may reject with anything on abort; a caller who calls
 * `abort('shutting down')` makes native `fetch` reject with that bare
 * string; and a body stream broken by our own deadline looks the same by
 * name as one broken by the network.
 *
 * The caller is checked first, so an abort that races the deadline is the
 * caller's: their intent wins, and a caller abort is never retried.
 */
function classifyFailure<T>({
  result,
  callerSignal,
  timeoutSignal,
}: {
  readonly result: AttemptFailure<T>
  readonly callerSignal: AbortSignal | undefined
  readonly timeoutSignal: AbortSignal
}): RetryCause {
  if (result.kind === 'error-response') {
    const retryAfterMs = readRetryAfterMs({ headers: result.response.headers })
    return {
      kind: 'status',
      status: result.response.status,
      ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
    }
  }
  if (result.kind === 'parse-failure') return { kind: 'parse' }
  if (callerSignal?.aborted === true) return { kind: 'abort' }
  if (timeoutSignal.aborted) return { kind: 'timeout' }
  // The HTTP runtime's own deadline (Node's fetch gives up after 300 s)
  // is a timeout too, whatever `timeoutMs` says.
  if (runtimeTimeoutCode({ error: result.error }) !== undefined) {
    return { kind: 'timeout' }
  }
  return { kind: 'connection' }
}

type TerminalRequest = {
  readonly method: BrewHttpMethod
  readonly url: string
  readonly timeoutMs: number
  readonly attempts: number
  readonly idempotencyKey: string | undefined
}

/** Build the error for the attempt the loop gives up on. */
async function toTerminalError<T>({
  result,
  cause,
  attemptSignal,
  callerSignal,
  unknownOutcome,
  request,
}: {
  readonly result: AttemptFailure<T>
  readonly cause: RetryCause
  readonly attemptSignal: AbortSignal
  readonly callerSignal: AbortSignal | undefined
  readonly unknownOutcome: UnknownOutcome | undefined
  readonly request: TerminalRequest
}): Promise<Error> {
  switch (result.kind) {
    case 'error-response': {
      // Read under the attempt's still-live signal, so a stalled error body
      // hits the deadline instead of hanging. A read that fails does NOT
      // replace the error: the status is the news, and `bodyError` says why
      // the envelope is incomplete.
      const { body, bodyError } = await readErrorBody({
        response: result.response,
        signal: attemptSignal,
      })
      if (callerSignal?.aborted === true) {
        throwReason({ reason: callerSignal.reason })
      }
      const apiError = BrewApiError.fromResponse({
        status: result.response.status,
        headers: result.response.headers,
        body,
        bodyError,
        idempotencyKey: request.idempotencyKey,
      })
      if (
        apiError.code === IDEMPOTENCY_IN_PROGRESS &&
        unknownOutcome !== undefined
      ) {
        // Our own earlier attempt holds the key: what is actually unknown
        // is the outcome of THAT attempt. It is not a conflict.
        return transportError({
          kind: unknownOutcome.kind,
          error: unknownOutcome.error,
          request,
          isInProgress: true,
        })
      }
      return apiError
    }
    case 'parse-failure':
      return new BrewParseError({
        status: result.response.status,
        requestId: result.response.headers.get('x-request-id') ?? undefined,
        bodyPreview: result.text.slice(0, 256),
        cause: result.error,
      })
    case 'transport-failure':
      return transportError({
        kind: cause.kind === 'timeout' ? 'timeout' : 'connection',
        error: result.error,
        request,
        isInProgress: false,
      })
  }
}

function transportError({
  kind,
  error,
  request,
  isInProgress,
}: {
  readonly kind: 'timeout' | 'connection'
  readonly error: unknown
  readonly request: TerminalRequest
  readonly isInProgress: boolean
}): Error {
  const shared = {
    method: request.method,
    url: request.url,
    attempts: request.attempts,
    idempotencyKey: request.idempotencyKey,
    inProgress: isInProgress,
    cause: error,
  }
  if (kind === 'timeout') {
    return new BrewTimeoutError({ ...shared, timeoutMs: request.timeoutMs })
  }
  return new BrewConnectionError(shared)
}

async function readErrorBody({
  response,
  signal,
}: {
  readonly response: Response
  readonly signal: AbortSignal
}): Promise<{ readonly body: unknown; readonly bodyError: Error | undefined }> {
  let text: string
  try {
    text = await readTextWithin({ response, signal })
  } catch (error) {
    return { body: null, bodyError: normalizeToError(error) }
  }
  if (text === '') return { body: null, bodyError: undefined }
  try {
    return { body: JSON.parse(text) as unknown, bodyError: undefined }
  } catch {
    // Not JSON at all — an HTML 502 from a proxy, say. That is the
    // documented generic-envelope fallback, not a truncation.
    return { body: null, bodyError: undefined }
  }
}

/**
 * Read a response body as UTF-8 text, bounded by `signal`.
 *
 * Reads through its own reader rather than `response.text()`: `text()`
 * locks the stream for its whole lifetime, and a locked stream cannot be
 * cancelled — `body.cancel()` throws `Invalid state: ReadableStream is
 * locked` and releases nothing. Owning the reader lets an abort both end the
 * read at once AND release the connection.
 *
 * Native `fetch` already errors the body when the request signal aborts, so
 * on undici the listener below is belt and braces. It is not redundant:
 * `config.fetch` is public, and a wrapper, polyfill or test double may hand
 * back a body that ignores the signal entirely — which would silently bring
 * back the exact hang this exists to prevent.
 */
async function readTextWithin({
  response,
  signal,
}: {
  readonly response: Response
  readonly signal: AbortSignal
}): Promise<string> {
  const stream = response.body
  if (stream === null) return ''

  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let wasAborted = false

  const onAbort = (): void => {
    wasAborted = true
    // Not awaited: a pending `read()` settles as part of the cancel, and
    // waiting on the source's own cleanup is exactly what could hang.
    reader.cancel(signal.reason).catch(() => {
      // Nothing left to release.
    })
  }

  if (signal.aborted) {
    onAbort()
  } else {
    signal.addEventListener('abort', onAbort, { once: true })
  }

  try {
    let text = ''
    /* eslint-disable no-await-in-loop --
     * A stream is read one chunk at a time; that is what a stream is. */
    for (;;) {
      const chunk = await reader.read()
      if (chunk.done) break
      text += decoder.decode(chunk.value, { stream: true })
    }
    /* eslint-enable no-await-in-loop */
    text += decoder.decode()

    // A cancelled read ends like a short body. Without this check a
    // deadline would surface as a truncated payload and a SyntaxError.
    if (wasAborted) throwReason({ reason: signal.reason })
    return text
  } finally {
    signal.removeEventListener('abort', onAbort)
  }
}

/**
 * Release a body we are abandoning. Best effort: `cancel()` throws on a
 * locked or used stream and rejects on an errored one, and neither matters
 * when the response is being thrown away. The wait is bounded to one turn
 * of the event loop, so a custom stream whose cancel never settles cannot
 * stall the retry.
 */
async function cancelBody({
  response,
  reason,
}: {
  readonly response: Response | undefined
  readonly reason?: unknown
}): Promise<void> {
  const body = response?.body
  if (body === null || body === undefined || response?.bodyUsed === true) {
    return
  }
  let cancelled: Promise<void>
  try {
    cancelled = body.cancel(reason).catch(() => {
      // Already errored or closed.
    })
  } catch {
    return
  }
  await Promise.race([cancelled, nextTurn()])
}

function nextTurn(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

type AttemptSignal = {
  /** Handed to `fetch`; stays live through the body read. */
  readonly signal: AbortSignal
  /** The deadline alone, so a failure is attributed by flag. */
  readonly timeoutSignal: AbortSignal
  /** Abort this attempt because its response is being thrown away. */
  readonly discard: () => void
  /** Detaches any listener on the caller's signal. */
  readonly release: () => void
}

/**
 * The signal for one attempt: the caller's, plus a fresh deadline.
 *
 * `AbortSignal.timeout` is the heart of the fix. `fetch` keeps its request
 * signal bound to the response body, so the deadline — and the caller's
 * abort — reach the body read as well as the headers. The hand-rolled
 * `setTimeout` it replaces could only ever cover the headers: the one safe
 * moment to clear that timer was when `fetch` resolved.
 *
 * Nothing needs clearing on the native path: the `AbortSignal.timeout`
 * timer is unref'd (it never keeps a process alive) and `AbortSignal.any`
 * holds its composite weakly from the sources.
 */
function createAttemptSignal({
  timeoutMs,
  callerSignal,
}: {
  readonly timeoutMs: number
  readonly callerSignal: AbortSignal | undefined
}): AttemptSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  const discarded = new AbortController()
  const combined = anySignal({
    signals:
      callerSignal === undefined
        ? [timeoutSignal, discarded.signal]
        : [callerSignal, timeoutSignal, discarded.signal],
  })
  return {
    signal: combined.signal,
    timeoutSignal,
    discard: () => {
      discarded.abort(
        new DOMException(
          'The SDK discarded this response to retry the request.',
          'AbortError'
        )
      )
    },
    release: combined.release,
  }
}

function combineCallerSignals({
  signals,
}: {
  readonly signals: ReadonlyArray<AbortSignal | undefined>
}): { readonly signal: AbortSignal | undefined; readonly release: () => void } {
  const present = signals.filter(
    (signal): signal is AbortSignal => signal !== undefined
  )
  const [first, ...rest] = present
  if (first === undefined) return { signal: undefined, release: noop }
  if (rest.length === 0) return { signal: first, release: noop }
  return anySignal({ signals: [first, ...rest] })
}

/**
 * `AbortSignal.any`, which landed in Node 20.3.0. `engines` says `>=20`, so
 * 20.0–20.2 get the listener-based equivalent (and a `release` to detach it)
 * instead of a TypeError at runtime.
 */
function anySignal({
  signals,
}: {
  readonly signals: readonly [AbortSignal, ...Array<AbortSignal>]
}): { readonly signal: AbortSignal; readonly release: () => void } {
  if (typeof AbortSignal.any === 'function') {
    return { signal: AbortSignal.any([...signals]), release: noop }
  }

  const controller = new AbortController()
  const alreadyAborted = signals.find((signal) => signal.aborted)
  if (alreadyAborted !== undefined) {
    controller.abort(alreadyAborted.reason)
    return { signal: controller.signal, release: noop }
  }

  const listeners = signals.map((source) => {
    const onAbort = (): void => {
      controller.abort(source.reason)
    }
    source.addEventListener('abort', onAbort, { once: true })
    return { source, onAbort }
  })
  return {
    signal: controller.signal,
    release: () => {
      for (const { source, onAbort } of listeners) {
        source.removeEventListener('abort', onAbort)
      }
    },
  }
}

function noop(): void {
  // Nothing to release.
}

/**
 * Rethrow the abort reason exactly as the caller gave it. `AbortSignal.reason`
 * is `any` by spec and a caller may `abort('because')`, so this is the one
 * place the SDK throws a value it cannot prove is an `Error` — on purpose:
 * `fetch` rejects with the reason verbatim and consumers compare against it.
 */
function throwReason({ reason }: { readonly reason: unknown }): never {
  throw reason
}

/**
 * A validated `timeoutMs` as a timer delay. `Infinity` means "no deadline"
 * (the longest a timer can wait); a fraction rounds down. `NaN` and negative
 * values never get here — `assertTimeoutMs` refuses them, because silently
 * turning a bad value into "wait forever" is exactly the hang to avoid.
 */
function normalizeTimeoutMs({
  timeoutMs,
}: {
  readonly timeoutMs: number
}): number {
  if (timeoutMs === Number.POSITIVE_INFINITY) return MAX_TIMER_MS
  return Math.min(Math.floor(timeoutMs), MAX_TIMER_MS)
}

/**
 * Read `Retry-After` as delta-seconds and return it as milliseconds.
 * Returns `undefined` when the header is missing or non-numeric. HTTP-date
 * form is intentionally unsupported — the Brew API contract only emits
 * delta-seconds.
 */
function readRetryAfterMs({
  headers,
}: {
  readonly headers: Headers
}): number | undefined {
  const raw = headers.get('retry-after')
  if (raw === null) return undefined
  const seconds = Number(raw)
  if (!Number.isFinite(seconds)) return undefined
  return seconds * 1000
}

/**
 * Default sleep: a real `setTimeout`-backed wait that a caller abort ends at
 * once, rejecting with the abort reason. Tests override it via
 * `HttpTuning.sleep` so the retry loop runs at full speed.
 */
function defaultSleep({
  ms,
  signal,
}: {
  readonly ms: number
  readonly signal: AbortSignal | undefined
}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted === true) {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the caller's reason, verbatim (see throwReason).
      reject(signal.reason)
      return
    }
    const onAbort = (): void => {
      clearTimeout(timer)
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the caller's reason, verbatim (see throwReason).
      reject(signal?.reason)
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Coerce an unknown thrown value into a real `Error` instance. `fetch`
 * should always reject with an `Error`, but the catch binding is typed
 * `unknown` and `@typescript-eslint/only-throw-error` rightly refuses to
 * let us rethrow something we have not proven is throwable.
 */
function normalizeToError(value: unknown): Error {
  if (value instanceof Error) return value
  return new Error(typeof value === 'string' ? value : 'Unknown error')
}

/**
 * Decide whether a resource method should return the unwrapped data
 * payload (the default) or the full `BrewRawResponse<T>` envelope
 * (when the caller passes `{ raw: true }` in `RequestOptions`).
 *
 * The actual return-type narrowing is done at call sites with an
 * overload pair — this helper just centralizes the runtime branch so
 * resource methods do not all reinvent it.
 */
export function unwrapResponse<T>(
  response: BrewRawResponse<T>,
  options: RequestOptions | undefined
): T | BrewRawResponse<T> {
  return options?.raw === true ? response : response.data
}
