export type BuildHeadersInput = {
  readonly apiKey: string
  readonly userAgent: string
  readonly idempotencyKey?: string
  readonly hasBody?: boolean
  readonly extras?: Readonly<Record<string, string>>
}

/**
 * Build the outbound header set for a Brew API request.
 *
 * Invariants:
 *   - `Authorization: Bearer <apiKey>` is always set. The Brew API also
 *     accepts `X-API-Key` but Bearer is the standard and the SDK does not
 *     expose the alternative to keep the public surface small.
 *   - `Accept: application/json` is always set — we only ever want JSON.
 *   - `User-Agent` is always set from the resolved client config so every
 *     request is attributable.
 *   - `Content-Type: application/json` is only set when the request has a
 *     body; setting it on a GET would be misleading.
 *   - `Idempotency-Key` is only set when one was resolved upstream
 *     (auto-generated for POST, explicitly passed, or omitted for other
 *     methods — that decision lives in `core/idempotency.ts`).
 *   - `extras` are merged last so callers can override defaults per-request
 *     if they really need to (e.g. tracing headers from a host app).
 *
 * Always returns a fresh `Headers` instance so callers can mutate the
 * result without leaking state across requests.
 */
export function buildHeaders(input: BuildHeadersInput): Headers {
  const headers = new Headers()

  headers.set('authorization', `Bearer ${input.apiKey}`)
  headers.set('user-agent', input.userAgent)
  headers.set('accept', 'application/json')

  if (input.hasBody === true) {
    headers.set('content-type', 'application/json')
  }

  if (input.idempotencyKey !== undefined) {
    headers.set('idempotency-key', input.idempotencyKey)
  }

  if (input.extras) {
    for (const [key, value] of Object.entries(input.extras)) {
      headers.set(key, value)
    }
  }

  return headers
}
