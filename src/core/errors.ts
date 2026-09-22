import type { BrewErrorType } from '../types'

/**
 * Input shape for the `BrewApiError` constructor. Mirrors the public
 * surface of the class — every field is required and explicit, callers
 * supply `undefined` for any field they don't have. `details` and `body`
 * are the two exceptions: they arrived after the class shipped, so they
 * stay optional and older constructor call sites keep compiling.
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
  readonly details?: Record<string, unknown> | undefined
  readonly body?: unknown
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

/** Where the generic fallback points: the public error catalogue. */
const ERRORS_DOCS_URL = 'https://docs.brew.new/api-reference/api/errors'

/** The one endpoint whose failures do not use the `{ error }` envelope. */
const LEGACY_FIRE_DOCS_URL =
  'https://docs.brew.new/api-reference/public-v1/automations/fire-a-trigger'

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
  /**
   * The envelope's `details` object when the server sent one. For a
   * trigger-fire `payload_mismatch` (`400 INVALID_PAYLOAD`) that is
   * `{ errors[], warnings[], payloadSchema, contractHash?, enforcement? }`
   * — every field the payload got wrong, and the schema to repair it
   * against. `undefined` when the response carried none.
   */
  readonly details: Record<string, unknown> | undefined
  /**
   * The parsed response body exactly as received (`undefined` when it was
   * not JSON). The escape hatch: whatever the mapping does not model — the
   * fire envelope's own `status` discriminator, say — is still here.
   */
  readonly body: unknown

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
    this.details = init.details
    this.body = init.body
  }

  /**
   * Build a `BrewApiError` from a parsed HTTP response.
   *
   * The Brew API wraps every error in `{ error: { code, type, ... } }`, so
   * this method unwraps the envelope before mapping. The ONE documented
   * exception is trigger fire (`POST`/`GET /v1/automations/triggers/{id}/fire`),
   * which answers success and failure alike with the legacy fire envelope
   * `{ success, status, code, message, receivedAt, details? }` — top-level
   * `code` and `message`, no `error` wrapper, no `type`. That shape gets its
   * own arm (`parseLegacyEnvelope`): `code`/`message`/`details` verbatim,
   * `type` derived from the HTTP status. Before it existed a documented
   * `400 INVALID_PAYLOAD` degraded to `code: 'unknown_error'` with retry
   * advice, and `details.errors[]` (which fields were wrong) was lost.
   *
   * Falls back to a generic envelope when the body is neither shape — we
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
    const requestId = headers.get('x-request-id') ?? undefined
    const headerRetryAfter = parseRetryAfter(headers.get('retry-after'))

    const envelope = parseErrorEnvelope(body)
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
        details: envelope.details,
        body,
      })
    }

    const legacy = parseLegacyEnvelope(body)
    if (legacy) {
      return new BrewApiError({
        message: legacy.message,
        status,
        code: legacy.code,
        type: errorTypeForStatus(status),
        param: undefined,
        suggestion: suggestionForStatus(status),
        docs: LEGACY_FIRE_DOCS_URL,
        requestId,
        retryAfter: headerRetryAfter,
        details: legacy.details,
        body,
      })
    }

    return new BrewApiError({
      message: `Request failed with status ${String(status)}`,
      status,
      code: 'unknown_error',
      type: errorTypeForStatus(status),
      param: undefined,
      suggestion: suggestionForStatus(status),
      docs: ERRORS_DOCS_URL,
      requestId,
      retryAfter: headerRetryAfter,
      details: undefined,
      body,
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
  // Missing from this set previously — real `402 INSUFFICIENT_CREDITS` and
  // `503 SERVICE_UNAVAILABLE` envelopes degraded to `code: 'unknown_error'`,
  // breaking the documented branch-on-`code` contract. tsc guards each entry
  // against the generated union; keep this list in sync when the spec adds a
  // type (a missing entry silently downgrades that error family).
  'payment_required',
  'service_unavailable',
  'internal_error',
])

/** The standard envelope, narrowed — plus its optional `details` object. */
type ParsedErrorEnvelope = {
  code: string
  type: BrewErrorType
  message: string
  suggestion: string
  docs: string
  param?: string
  retryAfter?: number
  details?: Record<string, unknown>
}

/** The legacy fire envelope's failure form, narrowed. */
type ParsedLegacyEnvelope = {
  code: string
  message: string
  details: Record<string, unknown> | undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Narrow an unknown response body into the standard envelope, returning
 * `undefined` if the shape does not match. The Brew wire format is
 * `{ error: { code, type, message, suggestion, docs, ... } }` — the inner
 * fields `code`, `type`, `message`, `suggestion`, and `docs` are all
 * required per the OpenAPI contract; `param`, `retryAfter` and `details`
 * are optional. `details` passes through untouched: the server serialises
 * whatever the refusal attached (field errors, conflicting ids, …).
 */
function parseErrorEnvelope(body: unknown): ParsedErrorEnvelope | undefined {
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

  const envelope: ParsedErrorEnvelope = {
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
  if (isRecord(inner.details)) {
    envelope.details = inner.details
  }

  return envelope
}

/**
 * The legacy fire envelope's failure form: no `error` wrapper, string
 * `code` + `message` at the top level, `success` anything but `true` (a
 * `success: true` body on a non-2xx status is not a refusal we can name,
 * so it takes the generic fallback). `details` rides along when it is an
 * object.
 */
function parseLegacyEnvelope(body: unknown): ParsedLegacyEnvelope | undefined {
  if (!isRecord(body)) return undefined
  if (body.success === true) return undefined
  if (typeof body.code !== 'string' || typeof body.message !== 'string') {
    return undefined
  }
  return {
    code: body.code,
    message: body.message,
    details: isRecord(body.details) ? body.details : undefined,
  }
}

/**
 * The closest `BrewErrorType` for a response that did not carry one.
 * Keeps the branch-on-`type` contract honest for the legacy envelope and
 * for non-JSON bodies alike: a 4xx is never an `internal_error`.
 */
function errorTypeForStatus(status: number): BrewErrorType {
  switch (status) {
    case 400:
    case 422:
      return 'invalid_request'
    case 401:
      return 'authentication_error'
    case 402:
      return 'payment_required'
    case 403:
      return 'authorization_error'
    case 404:
      return 'not_found'
    case 409:
      return 'conflict'
    case 429:
      return 'rate_limit'
    case 501:
      return 'not_implemented'
    case 503:
      return 'service_unavailable'
    default:
      return 'internal_error'
  }
}

/**
 * Retry advice is only honest for throttling and server faults. A 4xx
 * fails the same way on every retry — say so, and point at the request.
 */
function suggestionForStatus(status: number): string {
  if (status === 429 || status >= 500) {
    return 'Retry the request. If it keeps failing, contact support.'
  }
  return 'Fix the request before sending it again — the same request fails the same way. See `details` for the specifics when present.'
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
