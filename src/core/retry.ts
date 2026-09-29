import type { BrewHttpMethod } from '../types'

/**
 * Status codes we treat as transient and safe to retry. Everything else
 * (including 2xx and 3xx) is NOT retried.
 */
const RETRYABLE_STATUSES: ReadonlySet<number> = new Set([
  408, 429, 500, 502, 503, 504,
])

/**
 * Methods whose retry decision is gated purely by response status / network
 * error. POST is excluded because it's only retryable with an idempotency
 * key; PATCH is excluded because we never retry PATCH.
 */
const ALWAYS_RETRYABLE_METHODS: ReadonlySet<BrewHttpMethod> = new Set([
  'GET',
  'DELETE',
  'PUT',
])

/**
 * The longest `Retry-After` the SDK will wait out inside one call. A longer
 * wait looks exactly like a hang to the caller, so the `BrewApiError` is
 * thrown instead, carrying `retryAfter` for the caller to schedule. Matches
 * the Brew app's own ceiling for provider retries; every Brew rate-limit
 * window is 60 s.
 */
export const MAX_RETRY_AFTER_MS = 60_000

/**
 * Why an attempt failed. An explicit discriminant rather than a loose
 * `{ status?, error? }` pair: a body that broke after a 200 arrived has a
 * status AND is a network failure, and a caller abort, a deadline and a
 * dropped connection all reject `fetch` the same way but deserve different
 * answers.
 */
export type RetryCause =
  /** The server answered with this status (the body may not have been read). */
  | {
      readonly kind: 'status'
      readonly status: number
      /** From the `Retry-After` header, when it had one. */
      readonly retryAfterMs?: number | undefined
    }
  /** DNS, TCP, TLS, a rejected `fetch`, or a body stream that broke mid-read. */
  | { readonly kind: 'connection' }
  /** The attempt's deadline — `timeoutMs`, or the HTTP runtime's own. */
  | { readonly kind: 'timeout' }
  /** The caller's `AbortSignal` (request or client). */
  | { readonly kind: 'abort' }
  /** A complete 2xx body that is not JSON. */
  | { readonly kind: 'parse' }

export type RetryDecisionInput = {
  readonly method: BrewHttpMethod
  readonly cause: RetryCause
  readonly attempt: number
  readonly maxRetries: number
  readonly hasIdempotencyKey: boolean
  /** `RequestOptions.retryOnTimeout ?? BrewClientConfig.retryOnTimeout`. */
  readonly shouldRetryOnTimeout: boolean
}

/**
 * Decide whether a failing request should be retried.
 *
 *   0. Intent and determinism — never retry a caller abort (the caller
 *      asked for the request to stop) or a malformed 2xx (the same bytes
 *      come back). Checked before anything else.
 *   1. Attempt cap — never retry past `maxRetries`.
 *   2. Method policy — PATCH never retries; POST only retries when an
 *      idempotency key is attached; GET/PUT/DELETE are fine to retry.
 *   3. Cause — a connection failure retries; a timeout retries unless
 *      `shouldRetryOnTimeout` is off; a status retries when it is
 *      408/429/5xx and any `Retry-After` is within `MAX_RETRY_AFTER_MS`.
 */
export function shouldRetry(input: RetryDecisionInput): boolean {
  const { cause } = input
  if (cause.kind === 'abort' || cause.kind === 'parse') return false

  if (input.attempt >= input.maxRetries) return false

  const isMethodRetryable = isRetryableForMethod({
    method: input.method,
    hasIdempotencyKey: input.hasIdempotencyKey,
  })
  if (!isMethodRetryable) return false

  switch (cause.kind) {
    case 'connection':
      return true
    case 'timeout':
      return input.shouldRetryOnTimeout
    case 'status':
      if (!RETRYABLE_STATUSES.has(cause.status)) return false
      return (cause.retryAfterMs ?? 0) <= MAX_RETRY_AFTER_MS
  }
}

function isRetryableForMethod({
  method,
  hasIdempotencyKey,
}: {
  readonly method: BrewHttpMethod
  readonly hasIdempotencyKey: boolean
}): boolean {
  if (ALWAYS_RETRYABLE_METHODS.has(method)) return true
  if (method === 'POST') return hasIdempotencyKey
  return false
}

export type BackoffInput = {
  readonly attempt: number
  readonly baseMs: number
  readonly maxMs: number
  readonly retryAfterMs?: number
  /**
   * Random source in [0, 1]. Injected so tests can assert on exact values.
   * Defaults to `Math.random` in production.
   */
  readonly random?: () => number
}

/**
 * Compute how many milliseconds to wait before the next attempt.
 *
 * Policy:
 *   - If `retryAfterMs` is provided (typically from a `Retry-After` header),
 *     use it verbatim. The server is authoritative and we should not try
 *     to beat it with a shorter backoff.
 *   - Otherwise, exponential backoff: `baseMs * 2^attempt`, capped at
 *     `maxMs`, then multiplied by a random value in [0, 1] (full jitter).
 *     Full jitter is the AWS-recommended strategy for reducing thundering
 *     herd on shared downstream dependencies.
 */
export function computeBackoff(input: BackoffInput): number {
  if (input.retryAfterMs !== undefined) return input.retryAfterMs

  const random = input.random ?? Math.random
  const exponential = input.baseMs * 2 ** input.attempt
  const capped = Math.min(exponential, input.maxMs)
  return Math.floor(capped * random())
}
