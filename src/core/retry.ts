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

export type RetryDecisionInput = {
  readonly method: BrewHttpMethod
  readonly status?: number
  readonly error?: unknown
  readonly attempt: number
  readonly maxRetries: number
  readonly hasIdempotencyKey: boolean
}

/**
 * Decide whether a failing request should be retried.
 *
 * The decision has three gates, applied in order:
 *   1. Attempt cap — never retry past `maxRetries`.
 *   2. Method policy — PATCH never retries; POST only retries when an
 *      idempotency key is attached; GET/PUT/DELETE are fine to retry.
 *   3. Cause — the failure must be either a network error (no `status`
 *      present, an `error` was caught) or a retryable status code.
 */
export function shouldRetry(input: RetryDecisionInput): boolean {
  if (input.attempt >= input.maxRetries) return false

  const isMethodRetryable = isRetryableForMethod({
    method: input.method,
    hasIdempotencyKey: input.hasIdempotencyKey,
  })
  if (!isMethodRetryable) return false

  const isNetworkError = input.error !== undefined && input.status === undefined
  if (isNetworkError) return true

  if (input.status === undefined) return false
  return RETRYABLE_STATUSES.has(input.status)
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
