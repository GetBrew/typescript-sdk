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
  /**
   * The brand that brand-scoped resources act on, sent as `X-Brand-Id`.
   *
   * Only meaningful for an ORGANIZATION-scoped key: a brand-scoped key
   * resolves its own brand and rejects a different one with
   * `BRAND_SCOPE_MISMATCH`. An org-scoped key that sends no brand gets
   * `BRAND_ID_REQUIRED` — there is deliberately no default brand.
   * Organization-level resources such as `brands`, `templates`, `flows`, and `usage`
   * omit the header even when the client is pinned.
   *
   * Prefer `client.withBrand(id)` when you work across several brands; it
   * returns a pinned client rather than mutating this one.
   */
  readonly brandId?: string
  readonly baseUrl?: string
  readonly fetch?: BrewFetch
  /**
   * Per-attempt deadline in milliseconds, covering the whole attempt:
   * connecting, waiting for the headers, and reading the response body.
   * Default `30_000`. A few long-running methods set their own (see
   * `docs/configuration.md`).
   */
  readonly timeoutMs?: number
  readonly maxRetries?: number
  /**
   * Retry an attempt that hit `timeoutMs`, like any other transient failure.
   * Default `true`. Set `false` for a hard deadline: one attempt, then
   * `BrewTimeoutError`. A request's own `retryOnTimeout` wins.
   */
  readonly retryOnTimeout?: boolean
  /**
   * Cancels every request made through this client (and its `withBrand()`
   * clients) when it aborts — for shutting a process down cleanly. Combined
   * with each request's own `signal`; either one aborting stops the request,
   * and the request rejects with that signal's `reason`. Never retried.
   */
  readonly signal?: AbortSignal
  readonly userAgent?: string
}

/**
 * Fully-resolved config after defaults are applied. Every internal code path
 * should consume this, never the raw user config, so defaults are always
 * honored.
 */
export type ResolvedBrewClientConfig = {
  readonly apiKey: string
  /** `undefined` unless the caller pinned a brand. See `BrewClientConfig`. */
  readonly brandId: string | undefined
  readonly baseUrl: string
  readonly fetch: BrewFetch
  readonly timeoutMs: number
  readonly maxRetries: number
  readonly retryOnTimeout: boolean
  /** `undefined` unless the caller passed one. See `BrewClientConfig`. */
  readonly signal: AbortSignal | undefined
  readonly userAgent: string
}

/**
 * Per-request overrides. All fields optional — unset fields inherit from
 * the client config.
 */
export type RequestOptions = {
  /**
   * Cancels this request — while it connects, waits for headers, reads the
   * body, or backs off between retries. The request rejects with the
   * signal's `reason` (an `AbortError` `DOMException` unless you passed your
   * own) and is never retried. Cancelling does not stop work the server
   * already started; replay a write with the same `idempotencyKey`.
   */
  readonly signal?: AbortSignal
  /** Per-attempt deadline, body read included. Overrides the client's. */
  readonly timeoutMs?: number
  readonly maxRetries?: number
  /** Retry an attempt that hit `timeoutMs`. Overrides the client's. */
  readonly retryOnTimeout?: boolean
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
 * Every `code` the Brew API documents, as a union. `BrewApiError.code`
 * stays a `string` so a code the server ships before the SDK regenerates
 * still compares cleanly, but this union is the list to branch on:
 *
 *   if (error.code === 'SEND_QUOTA_EXCEEDED') { ... }
 *
 * v1 renamed several: `INSUFFICIENT_EMAIL_SENDS` folded into
 * `SEND_QUOTA_EXCEEDED` (402), `EVENT_NOT_FOUND` became
 * `TRIGGER_INSTANCE_NOT_FOUND`, and 429 is `RATE_LIMITED` only.
 */
export type BrewErrorCode = BrewErrorEnvelope['code']

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
