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
import { buildHeaders, buildUploadHeaders } from './headers'
import { resolveIdempotencyKey } from './idempotency'
import { computeBackoff, type RetryCause, shouldRetry } from './retry'
import { cancelBody, readTextWithin } from './body'
import {
  credentialRedactor,
  type Redactor,
  redactThrown,
  withoutQuery,
} from './redact'
import {
  combineCallerSignals,
  createAttemptSignal,
  defaultSleep,
  throwReason,
} from './signals'
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
  /**
   * `'none'` for a route that never replays (`x-brew-idempotency:
   * disabled`), such as one whose answer carries a one-time credential: no
   * `Idempotency-Key` is sent, not even one the caller passed, because it
   * would promise a replay that never happens. A retry is then a fresh
   * request that may write again, so such a POST retries only as often as
   * the request's own `maxRetries` says (default `defaultMaxRetries`).
   */
  readonly idempotency?: 'none'
  /**
   * A method's own default `maxRetries`. It replaces the client-wide
   * setting; a per-request `maxRetries` still wins.
   */
  readonly defaultMaxRetries?: number
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

/**
 * Input to `HttpClient.sendBytes`: raw bytes POSTed to an absolute URL the
 * API handed back, such as an image upload's `uploadUrl`.
 */
export type HttpBytesInput = {
  /** The whole URL, query included. Never joined to `baseUrl`. */
  readonly url: string
  /**
   * The bytes to send. A `Blob` is read afresh by every attempt, so a retry
   * resends the whole file.
   */
  readonly bytes: Blob
  /** Sent as `Content-Type`. */
  readonly contentType: string
  readonly options?: RequestOptions
  /** As on `HttpRequestInput`: a per-attempt FLOOR, never a cap. */
  readonly defaultTimeoutMs?: number
}

export type HttpClient = {
  request<T>(input: HttpRequestInput): Promise<BrewRawResponse<T>>
  /**
   * POST raw bytes to a URL that carries its own credential (an image
   * upload's `uploadUrl`). The same transport as `request` — the client's
   * `fetch`, the whole-attempt deadline, the caller's signals, the retry
   * loop and the error mapping — WITHOUT the client's credentials: no
   * `Authorization`, `X-Brand-Id` or `Idempotency-Key` (`buildUploadHeaders`).
   *
   * Retried like a keyed POST: the URL names the one write it makes, so a
   * repeat cannot write twice. Transport errors report the URL without its
   * query string, which is where such a URL keeps its credential.
   */
  sendBytes<T>(input: HttpBytesInput): Promise<BrewRawResponse<T>>
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
 * `{ request, sendBytes }` and never juggle config plumbing on their own.
 */
export function createHttpClient(
  config: ResolvedBrewClientConfig,
  tuning: HttpTuning = {}
): HttpClient {
  const retryBaseMs = tuning.retryBaseMs ?? DEFAULT_RETRY_BASE_MS
  const retryMaxMs = tuning.retryMaxMs ?? DEFAULT_RETRY_MAX_MS
  const random = tuning.random ?? Math.random
  const sleep = tuning.sleep ?? defaultSleep

  // `async` so a bad input (a missing path param) rejects like every other
  // failure instead of throwing synchronously.
  async function request<T>(
    input: HttpRequestInput
  ): Promise<BrewRawResponse<T>> {
    const options: RequestOptions = input.options ?? {}
    const isNeverReplayed = input.idempotency === 'none'
    // Resolved ONCE, before the loop: every attempt of this call carries
    // the same key, which is what lets the server replay instead of
    // re-running a write whose first attempt had an unknown outcome.
    const idempotencyKey = isNeverReplayed
      ? undefined
      : resolveIdempotencyKey({
          method: input.method,
          provided: options.idempotencyKey,
        })
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

    return send<T>({
      method: input.method,
      url,
      reportedUrl: url,
      headers,
      body: hasBody ? JSON.stringify(input.body) : null,
      options,
      defaultTimeoutMs: input.defaultTimeoutMs,
      defaultMaxRetries: input.defaultMaxRetries,
      idempotencyKey,
      mayRetryPost: idempotencyKey !== undefined || isNeverReplayed,
      redact: undefined,
    })
  }

  async function sendBytes<T>(
    input: HttpBytesInput
  ): Promise<BrewRawResponse<T>> {
    return send<T>({
      method: 'POST',
      url: input.url,
      reportedUrl: withoutQuery({ url: input.url }),
      headers: buildUploadHeaders({
        userAgent: config.userAgent,
        contentType: input.contentType,
      }),
      body: input.bytes,
      options: input.options ?? {},
      defaultTimeoutMs: input.defaultTimeoutMs,
      defaultMaxRetries: undefined,
      idempotencyKey: undefined,
      mayRetryPost: true,
      redact: credentialRedactor({ url: input.url }),
    })
  }

  /** The retry loop both `request` and `sendBytes` run. */
  async function send<T>(exchange: Exchange): Promise<BrewRawResponse<T>> {
    const { options, idempotencyKey } = exchange
    if (options.maxRetries !== undefined) {
      assertRetryCount({ value: options.maxRetries, name: 'maxRetries' })
    }
    if (options.timeoutMs !== undefined) {
      assertTimeoutMs({ value: options.timeoutMs, name: 'timeoutMs' })
    }
    const maxRetries =
      options.maxRetries ?? exchange.defaultMaxRetries ?? config.maxRetries
    const timeoutMs = normalizeTimeoutMs({
      timeoutMs:
        options.timeoutMs ??
        Math.max(config.timeoutMs, exchange.defaultTimeoutMs ?? 0),
    })
    const shouldRetryOnTimeout = options.retryOnTimeout ?? config.retryOnTimeout

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
            url: exchange.url,
            method: exchange.method,
            headers: exchange.headers,
            body: exchange.body,
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
            method: exchange.method,
            cause,
            attempt,
            maxRetries,
            // A POST retries only when a repeat cannot write twice, or when
            // the route never replays and the caller owns the retry count.
            hasIdempotencyKey: exchange.mayRetryPost,
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
                method: exchange.method,
                url: exchange.reportedUrl,
                timeoutMs,
                attempts: attempt + 1,
                idempotencyKey,
                redact: exchange.redact,
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
          attemptSignal.release?.()
        }
        attempt++
      }
    } finally {
      caller.release?.()
    }
    /* eslint-enable no-await-in-loop */

    // Unreachable: every iteration of the loop either returns or throws.
    throw new Error('http: retry loop exited without a result')
  }

  return { request, sendBytes }
}

/** One logical request: what `send` puts on the wire, every attempt. */
type Exchange = {
  readonly method: BrewHttpMethod
  readonly url: string
  /** The URL errors report: `url`, or `url` without a credential-bearing query. */
  readonly reportedUrl: string
  readonly headers: Headers
  readonly body: string | Blob | null
  readonly options: RequestOptions
  readonly defaultTimeoutMs: number | undefined
  readonly defaultMaxRetries: number | undefined
  readonly idempotencyKey: string | undefined
  /**
   * Gates retrying a POST: a repeat cannot write twice (the request carries
   * an idempotency key, or its URL names the one write it makes), or the
   * route never replays and `maxRetries` alone decides (`idempotency:
   * 'none'`, which defaults it to `defaultMaxRetries`).
   */
  readonly mayRetryPost: boolean
  /**
   * Set when `url` carries a credential (`sendBytes`): transport errors
   * redact it from their message and their `cause` chain.
   */
  readonly redact: Redactor | undefined
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
  readonly body: string | Blob | null
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
  readonly redact: Redactor | undefined
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
  // The message quotes the cause, so a credential-bearing URL that a
  // `fetch` named in its own error is redacted before either is built.
  const cause =
    request.redact === undefined
      ? error
      : redactThrown({ value: error, redact: request.redact })
  const shared = {
    method: request.method,
    url: request.url,
    attempts: request.attempts,
    idempotencyKey: request.idempotencyKey,
    inProgress: isInProgress,
    cause,
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
