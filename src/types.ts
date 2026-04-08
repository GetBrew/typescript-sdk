/**
 * Public type surface for @brew.new/sdk.
 *
 * This is the single source of truth every core/ module and every resource
 * imports from. Keep it small and boring.
 */

import type { components } from './generated/openapi-types'

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
 * response. The wire format wraps the actual error in an `error` envelope:
 *
 *   { "error": { "code": "...", "type": "...", "message": "...", ... } }
 *
 * `BrewErrorEnvelope` is the INNER object — the SDK strips the wrapper in
 * `BrewApiError.fromResponse` so consumers never have to think about it.
 *
 * Sourced directly from the generated OpenAPI types so the shape stays
 * locked to the real API contract — adding or removing a field upstream
 * surfaces here as a tsc error on the next `bun run generate:types`.
 */
export type BrewErrorEnvelope =
  components['schemas']['ApiErrorEnvelope']['error']

/**
 * The error `type` field is a closed enum on the wire. Re-exporting it as
 * its own union so consumers can branch on it with full type safety:
 *
 *   if (error.type === 'rate_limit') { ... }
 */
export type BrewErrorType = BrewErrorEnvelope['type']

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
