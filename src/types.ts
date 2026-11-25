import type { components } from './generated/openapi-types'

export type BrewHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type BrewFetch = typeof globalThis.fetch

export type BrewClientConfig = {
  readonly apiKey: string
  readonly brandId?: string
  readonly baseUrl?: string
  readonly fetch?: BrewFetch
  readonly timeoutMs?: number
  readonly maxRetries?: number
  readonly retryOnTimeout?: boolean
  readonly signal?: AbortSignal
  readonly userAgent?: string
}

export type ResolvedBrewClientConfig = {
  readonly apiKey: string
  readonly brandId: string | undefined
  readonly baseUrl: string
  readonly fetch: BrewFetch
  readonly timeoutMs: number
  readonly maxRetries: number
  readonly retryOnTimeout: boolean
  readonly signal: AbortSignal | undefined
  readonly userAgent: string
}

export type RequestOptions = {
  readonly signal?: AbortSignal
  readonly timeoutMs?: number
  readonly maxRetries?: number
  readonly retryOnTimeout?: boolean
  readonly idempotencyKey?: string
  readonly raw?: boolean
}

export type BrewErrorEnvelope =
  components['schemas']['ApiErrorEnvelope']['error']

export type BrewErrorType = BrewErrorEnvelope['type']

export type BrewErrorCode = BrewErrorEnvelope['code']

export type BrewRawResponse<T> = {
  readonly data: T
  readonly status: number
  readonly headers: Headers
  readonly requestId: string | undefined
}
