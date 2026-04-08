import type {
  BrewHttpMethod,
  BrewRawResponse,
  RequestOptions,
  ResolvedBrewClientConfig,
} from '../types'

import { BrewApiError } from './errors'
import { buildHeaders } from './headers'
import { resolveIdempotencyKey } from './idempotency'
import { computeBackoff, shouldRetry } from './retry'
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
  readonly sleep?: (ms: number) => Promise<void>
}

export type HttpClient = {
  request<T>(input: HttpRequestInput): Promise<BrewRawResponse<T>>
}

const DEFAULT_RETRY_BASE_MS = 100
const DEFAULT_RETRY_MAX_MS = 10_000

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
    const maxRetries = options.maxRetries ?? config.maxRetries
    const timeoutMs = options.timeoutMs ?? config.timeoutMs

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
      userAgent: config.userAgent,
      hasBody,
      ...(idempotencyKey !== undefined ? { idempotencyKey } : {}),
    })

    const requestBody: string | null = hasBody
      ? JSON.stringify(input.body)
      : null

    let attempt = 0
    while (attempt <= maxRetries) {
      const { signal, cleanup } = createRequestSignal({
        timeoutMs,
        callerSignal: options.signal,
      })

      let response: Response | undefined
      let networkError: Error | undefined

      try {
        // eslint-disable-next-line no-await-in-loop
        response = await config.fetch(url, {
          method: input.method,
          headers,
          body: requestBody,
          signal,
        })
      } catch (err) {
        networkError = normalizeToError(err)
      } finally {
        cleanup()
      }

      if (
        networkError !== undefined &&
        isCallerAbort({ error: networkError, callerSignal: options.signal })
      ) {
        throw networkError
      }

      if (response && response.ok) {
        // eslint-disable-next-line no-await-in-loop
        const data = await parseJsonBody<T>(response)
        return {
          data,
          status: response.status,
          headers: response.headers,
          requestId: response.headers.get('x-request-id') ?? undefined,
        }
      }

      const status = response?.status
      const isRetryable = shouldRetry({
        method: input.method,
        ...(status !== undefined ? { status } : {}),
        ...(networkError !== undefined ? { error: networkError } : {}),
        attempt,
        maxRetries,
        hasIdempotencyKey,
      })

      if (!isRetryable) {
        if (response) {
          // eslint-disable-next-line no-await-in-loop
          const body = await safeParseJsonBody(response)
          throw BrewApiError.fromResponse({
            status: response.status,
            headers: response.headers,
            body,
          })
        }
        throw networkError ?? new Error('http: request failed with no result')
      }

      const retryAfterMs = response
        ? readRetryAfterMs(response.headers)
        : undefined

      const delayMs = computeBackoff({
        attempt,
        baseMs: retryBaseMs,
        maxMs: retryMaxMs,
        ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
        random,
      })

      // eslint-disable-next-line no-await-in-loop
      await sleep(delayMs)
      attempt++
    }

    // Unreachable: every iteration of the loop either returns or throws.
    throw new Error('http: retry loop exited without a result')
  }

  return { request }
}

/**
 * Build an `AbortSignal` that fires when either the per-request timeout
 * elapses or the caller's own signal aborts. Returns a `cleanup` callback
 * so the caller can clear the timeout and detach the caller-signal listener
 * once the fetch promise settles — otherwise we'd leak timers and
 * listeners on every retry.
 */
function createRequestSignal({
  timeoutMs,
  callerSignal,
}: {
  readonly timeoutMs: number
  readonly callerSignal: AbortSignal | undefined
}): { readonly signal: AbortSignal; readonly cleanup: () => void } {
  const controller = new AbortController()

  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  let callerAbortListener: (() => void) | undefined

  if (callerSignal) {
    if (callerSignal.aborted) {
      controller.abort()
    } else {
      callerAbortListener = () => {
        controller.abort()
      }
      callerSignal.addEventListener('abort', callerAbortListener, {
        once: true,
      })
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId)
      if (callerAbortListener && callerSignal) {
        callerSignal.removeEventListener('abort', callerAbortListener)
      }
    },
  }
}

/**
 * Return true when a thrown error is the result of the caller's own
 * `AbortSignal` firing — we never retry those, because the caller
 * intentionally asked for the request to stop.
 */
function isCallerAbort({
  error,
  callerSignal,
}: {
  readonly error: unknown
  readonly callerSignal: AbortSignal | undefined
}): boolean {
  if (!callerSignal) return false
  if (!callerSignal.aborted) return false
  if (error instanceof Error && error.name === 'AbortError') return true
  return false
}

/**
 * Parse a successful response body as JSON, tolerating an empty body on
 * 204-style responses. Callers see `undefined` for the data payload when
 * the server returns no content.
 */
async function parseJsonBody<T>(response: Response): Promise<T> {
  const text = await response.text()
  if (text === '') return undefined as T
  return JSON.parse(text) as T
}

/**
 * Best-effort parse of an error response body. Returns `null` if the body
 * is empty or not valid JSON — we would rather fall back to the generic
 * envelope in `BrewApiError.fromResponse` than throw from the error path.
 */
async function safeParseJsonBody(response: Response): Promise<unknown> {
  try {
    const text = await response.text()
    if (text === '') return null
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

/**
 * Read `Retry-After` as delta-seconds and return it as milliseconds.
 * Returns `undefined` when the header is missing or non-numeric. HTTP-date
 * form is intentionally unsupported — the Brew API contract only emits
 * delta-seconds.
 */
function readRetryAfterMs(headers: Headers): number | undefined {
  const raw = headers.get('retry-after')
  if (raw === null) return undefined
  const seconds = Number(raw)
  if (!Number.isFinite(seconds)) return undefined
  return seconds * 1000
}

/**
 * Default sleep: a real `setTimeout`-backed wait. Tests override this via
 * `HttpTuning.sleep` so the retry loop runs at full speed.
 */
function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
