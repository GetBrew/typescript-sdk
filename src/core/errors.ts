import type { BrewErrorEnvelope } from '../types'

/**
 * Input shape for the `BrewApiError` constructor. Every field is required
 * and explicit — callers are expected to supply `undefined` for any field
 * they don't have. This keeps the constructor honest and avoids surprises
 * when `exactOptionalPropertyTypes` is enabled.
 */
type BrewApiErrorInit = {
  readonly message: string
  readonly status: number
  readonly code: string
  readonly type: string
  readonly requestId: string | undefined
  readonly retryAfter: number | undefined
  readonly suggestion: string | undefined
  readonly docs: string | undefined
}

/**
 * Input to `BrewApiError.fromResponse` — the already-parsed response body
 * plus the raw status and headers. The transport layer (`core/http.ts`) is
 * responsible for reading the Response and calling this factory, so the
 * error class itself stays pure and trivially testable.
 */
type FromResponseInput = {
  readonly status: number
  readonly headers: Headers
  readonly body: unknown
}

/**
 * The single public error class thrown by `@brew/api`. Every non-2xx
 * response and every transport-level failure becomes a `BrewApiError` with
 * the same shape, so consumers only need one `catch` branch.
 */
export class BrewApiError extends Error {
  readonly status: number
  readonly code: string
  readonly type: string
  readonly requestId: string | undefined
  readonly retryAfter: number | undefined
  readonly suggestion: string | undefined
  readonly docs: string | undefined

  constructor(init: BrewApiErrorInit) {
    super(init.message)
    this.name = 'BrewApiError'
    this.status = init.status
    this.code = init.code
    this.type = init.type
    this.requestId = init.requestId
    this.retryAfter = init.retryAfter
    this.suggestion = init.suggestion
    this.docs = init.docs
  }

  /**
   * Build a `BrewApiError` from a parsed HTTP response. Falls back to a
   * generic envelope if the body does not match the Brew error shape — we
   * would rather return a readable error than throw from the error
   * constructor itself.
   */
  static fromResponse({
    status,
    headers,
    body,
  }: FromResponseInput): BrewApiError {
    const envelope = parseErrorEnvelope(body)
    const requestId = headers.get('x-request-id') ?? undefined
    const retryAfter = parseRetryAfter(headers.get('retry-after'))

    if (envelope) {
      return new BrewApiError({
        message: envelope.message,
        status,
        code: envelope.code,
        type: envelope.type,
        requestId,
        retryAfter,
        suggestion: envelope.suggestion,
        docs: envelope.docs,
      })
    }

    return new BrewApiError({
      message: `Request failed with status ${String(status)}`,
      status,
      code: 'unknown_error',
      type: 'unknown',
      requestId,
      retryAfter,
      suggestion: undefined,
      docs: undefined,
    })
  }
}

/**
 * Narrow an unknown response body into `BrewErrorEnvelope`, returning
 * `undefined` if the shape does not match. All three required fields must
 * be strings — anything else means the server returned something we can't
 * interpret (HTML error page, empty body, etc.).
 */
function parseErrorEnvelope(body: unknown): BrewErrorEnvelope | undefined {
  if (body === null || typeof body !== 'object') return undefined

  const candidate = body as Record<string, unknown>

  const hasRequiredFields =
    typeof candidate.code === 'string' &&
    typeof candidate.type === 'string' &&
    typeof candidate.message === 'string'

  if (!hasRequiredFields) return undefined

  const envelope: {
    code: string
    type: string
    message: string
    suggestion?: string
    docs?: string
  } = {
    code: candidate.code as string,
    type: candidate.type as string,
    message: candidate.message as string,
  }

  if (typeof candidate.suggestion === 'string') {
    envelope.suggestion = candidate.suggestion
  }
  if (typeof candidate.docs === 'string') {
    envelope.docs = candidate.docs
  }

  return envelope
}

/**
 * Parse the `Retry-After` header into a number of seconds. Returns
 * `undefined` for a missing or non-numeric value. We deliberately do not
 * support the HTTP-date form here — the Brew API only emits delta-seconds
 * per the public contract.
 */
function parseRetryAfter(raw: string | null): number | undefined {
  if (raw === null) return undefined
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return undefined
  return parsed
}
