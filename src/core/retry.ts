import type { BrewHttpMethod } from '../types'

const RETRYABLE_STATUSES: ReadonlySet<number> = new Set([
  408, 429, 500, 502, 503, 504,
])

const ALWAYS_RETRYABLE_METHODS: ReadonlySet<BrewHttpMethod> = new Set([
  'GET',
  'DELETE',
  'PUT',
])

export const MAX_RETRY_AFTER_MS = 60_000

export type RetryCause =
  | {
      readonly kind: 'status'
      readonly status: number
      readonly retryAfterMs?: number | undefined
    }
  | { readonly kind: 'connection' }
  | { readonly kind: 'timeout' }
  | { readonly kind: 'abort' }
  | { readonly kind: 'parse' }

export type RetryDecisionInput = {
  readonly method: BrewHttpMethod
  readonly cause: RetryCause
  readonly attempt: number
  readonly maxRetries: number
  readonly hasIdempotencyKey: boolean
  readonly shouldRetryOnTimeout: boolean
}

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
  readonly random?: () => number
}

export function computeBackoff(input: BackoffInput): number {
  if (input.retryAfterMs !== undefined) return input.retryAfterMs

  const random = input.random ?? Math.random
  const exponential = input.baseMs * 2 ** input.attempt
  const capped = Math.min(exponential, input.maxMs)
  return Math.floor(capped * random())
}
