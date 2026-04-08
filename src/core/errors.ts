import type { BrewErrorEnvelope, BrewErrorType } from '../types'

/**
 * Input shape for the `BrewApiError` constructor. Mirrors the public
 * surface of the class — every field is required and explicit, callers
 * supply `undefined` for any field they don't have.
 */
type BrewApiErrorInit = {
  readonly message: string
  readonly status: number
  readonly code: string
  readonly type: BrewErrorType
  readonly param: string | undefined
  readonly suggestion: string
  readonly docs: string
  readonly requestId: string | undefined
  readonly retryAfter: number | undefined
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
 * The single public error class thrown by `@brew.new/sdk`. Every non-2xx
 * response and every transport-level failure becomes a `BrewApiError` with
 * the same shape, so consumers only need one `catch` branch.
 */
export class BrewApiError extends Error {
  readonly status: number
  readonly code: string
  readonly type: BrewErrorType
  readonly param: string | undefined
  readonly suggestion: string
  readonly docs: string
  readonly requestId: string | undefined
  readonly retryAfter: number | undefined

  constructor(init: BrewApiErrorInit) {
    super(init.message)
    this.name = 'BrewApiError'
    this.status = init.status
    this.code = init.code
    this.type = init.type
    this.param = init.param
    this.suggestion = init.suggestion
    this.docs = init.docs
    this.requestId = init.requestId
    this.retryAfter = init.retryAfter
  }

  /**
   * Build a `BrewApiError` from a parsed HTTP response.
   *
   * The Brew API wraps every error in `{ error: { code, type, ... } }`, so
   * this method unwraps the envelope before mapping. Falls back to a
   * generic envelope when the body is not a valid Brew error shape — we
   * would rather return a readable error than throw from the error path.
   *
   * `retryAfter` can come from two places: the body envelope or the
   * `Retry-After` header. The body wins when present (it's specific to
   * the exact error), the header is the fallback.
   */
  static fromResponse({
    status,
    headers,
    body,
  }: FromResponseInput): BrewApiError {
    const envelope = parseErrorEnvelope(body)
    const requestId = headers.get('x-request-id') ?? undefined
    const headerRetryAfter = parseRetryAfter(headers.get('retry-after'))

    if (envelope) {
      return new BrewApiError({
        message: envelope.message,
        status,
        code: envelope.code,
        type: envelope.type,
        param: envelope.param,
        suggestion: envelope.suggestion,
        docs: envelope.docs,
        requestId,
        retryAfter: envelope.retryAfter ?? headerRetryAfter,
      })
    }

    return new BrewApiError({
      message: `Request failed with status ${String(status)}`,
      status,
      code: 'unknown_error',
      type: 'internal_error',
      param: undefined,
      suggestion: 'Retry the request. If it keeps failing, contact support.',
      docs: 'https://docs.getbrew.io/api',
      requestId,
      retryAfter: headerRetryAfter,
    })
  }
}

/**
 * Closed enum of error types the Brew API may emit. Pinned to the
 * generated OpenAPI types via `BrewErrorType`. Used to safely narrow the
 * unknown body shape into the typed envelope.
 */
const VALID_ERROR_TYPES: ReadonlySet<BrewErrorType> = new Set<BrewErrorType>([
  'authentication_error',
  'authorization_error',
  'invalid_request',
  'not_found',
  'not_implemented',
  'conflict',
  'rate_limit',
  'internal_error',
])

/**
 * Narrow an unknown response body into `BrewErrorEnvelope`, returning
 * `undefined` if the shape does not match. The Brew wire format is
 * `{ error: { code, type, message, suggestion, docs, ... } }` — the inner
 * fields `code`, `type`, `message`, `suggestion`, and `docs` are all
 * required per the OpenAPI contract; `param` and `retryAfter` are
 * optional.
 */
function parseErrorEnvelope(body: unknown): BrewErrorEnvelope | undefined {
  if (body === null || typeof body !== 'object') return undefined

  const wrapper = body as { error?: unknown }
  if (wrapper.error === null || typeof wrapper.error !== 'object') {
    return undefined
  }

  const inner = wrapper.error as Record<string, unknown>

  const hasRequiredFields =
    typeof inner.code === 'string' &&
    typeof inner.type === 'string' &&
    typeof inner.message === 'string' &&
    typeof inner.suggestion === 'string' &&
    typeof inner.docs === 'string'

  if (!hasRequiredFields) return undefined

  const innerType = inner.type as string
  if (!VALID_ERROR_TYPES.has(innerType as BrewErrorType)) return undefined

  const envelope: {
    code: string
    type: BrewErrorType
    message: string
    suggestion: string
    docs: string
    param?: string
    retryAfter?: number
  } = {
    code: inner.code as string,
    type: innerType as BrewErrorType,
    message: inner.message as string,
    suggestion: inner.suggestion as string,
    docs: inner.docs as string,
  }

  if (typeof inner.param === 'string') {
    envelope.param = inner.param
  }
  if (
    typeof inner.retryAfter === 'number' &&
    Number.isFinite(inner.retryAfter)
  ) {
    envelope.retryAfter = inner.retryAfter
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
