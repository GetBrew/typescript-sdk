/**
 * Public type surface for @brew/api.
 *
 * This is the single source of truth every core/ module and every resource
 * imports from. Keep it small and boring.
 */

export type BrewHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type BrewFetch = typeof globalThis.fetch

/**
 * User-provided client configuration. Only `apiKey` is required; everything
 * else has a sensible default resolved in `core/config.ts`.
 */
export type BrewClientConfig = {
  readonly apiKey: string
  readonly baseUrl?: string
  readonly fetch?: BrewFetch
  readonly timeoutMs?: number
  readonly maxRetries?: number
  readonly userAgent?: string
}

/**
 * Fully-resolved config after defaults are applied. Every internal code path
 * should consume this, never the raw user config, so defaults are always
 * honored.
 */
export type ResolvedBrewClientConfig = {
  readonly apiKey: string
  readonly baseUrl: string
  readonly fetch: BrewFetch
  readonly timeoutMs: number
  readonly maxRetries: number
  readonly userAgent: string
}

/**
 * Per-request overrides. All fields optional — unset fields inherit from
 * the client config.
 */
export type RequestOptions = {
  readonly signal?: AbortSignal
  readonly timeoutMs?: number
  readonly maxRetries?: number
  readonly idempotencyKey?: string
  readonly raw?: boolean
}

/**
 * Shape of the error body returned by the Brew public API inside a non-2xx
 * response. This maps 1:1 to the public contract's error envelope.
 *
 * TODO: replace with the generated OpenAPI type once `src/generated/` is
 * populated from the app repo spec.
 */
export type BrewErrorEnvelope = {
  readonly code: string
  readonly type: string
  readonly message: string
  readonly suggestion?: string
  readonly docs?: string
}

/**
 * Return shape when a caller opts into `{ raw: true }`. Gives them the
 * parsed body alongside transport metadata for debugging, rate-limit
 * inspection, or request-id correlation.
 */
export type BrewRawResponse<T> = {
  readonly data: T
  readonly status: number
  readonly headers: Headers
  readonly requestId: string | undefined
}
