import type { BrewErrorType, BrewHttpMethod } from '../types'

export class BrewInputError extends Error {
  readonly param: string

  constructor(input: { readonly param: string; readonly message: string }) {
    super(input.message)
    this.name = 'BrewInputError'
    this.param = input.param
  }
}

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
  readonly bodyError?: Error | undefined
  readonly idempotencyKey?: string | undefined
  readonly uploadId?: string | undefined
}

type FromResponseInput = {
  readonly status: number
  readonly headers: Headers
  readonly body: unknown
  readonly bodyError?: Error | undefined
  readonly idempotencyKey?: string | undefined
  readonly uploadId?: string | undefined
}

const ERRORS_DOCS_URL = 'https://docs.brew.new/api-reference/api/errors'

const LEGACY_FIRE_DOCS_URL =
  'https://docs.brew.new/api-reference/public-v1/automations/fire-a-trigger'

export class BrewApiError extends Error {
  readonly status: number
  readonly code: string
  readonly type: BrewErrorType
  readonly param: string | undefined
  readonly suggestion: string
  readonly docs: string
  readonly requestId: string | undefined
  readonly retryAfter: number | undefined
  readonly details: Record<string, unknown> | undefined
  readonly body: unknown
  readonly bodyError: Error | undefined
  readonly idempotencyKey: string | undefined
  readonly uploadId: string | undefined

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
    this.bodyError = init.bodyError
    this.idempotencyKey = init.idempotencyKey
    this.uploadId = init.uploadId
  }

  static fromResponse({
    status,
    headers,
    body,
    bodyError,
    idempotencyKey,
    uploadId,
  }: FromResponseInput): BrewApiError {
    const requestId = headers.get('x-request-id') ?? undefined
    const headerRetryAfter = parseRetryAfter(headers.get('retry-after'))
    const context = { bodyError, idempotencyKey, uploadId }

    const envelope = parseErrorEnvelope(body)
    if (envelope) {
      return new BrewApiError({
        message: envelope.message,
        status,
        code: envelope.code,
        type: envelope.type ?? errorTypeForStatus({ status }),
        param: envelope.param,
        suggestion: envelope.suggestion,
        docs: envelope.docs,
        requestId,
        retryAfter: envelope.retryAfter ?? headerRetryAfter,
        details: envelope.details,
        body,
        ...context,
      })
    }

    const legacy = parseLegacyEnvelope({ body })
    if (legacy) {
      return new BrewApiError({
        message: legacy.message,
        status,
        code: legacy.code,
        type: errorTypeForStatus({ status }),
        param: undefined,
        suggestion: suggestionForStatus({ status }),
        docs: LEGACY_FIRE_DOCS_URL,
        requestId,
        retryAfter: headerRetryAfter,
        details: legacy.details,
        body,
        ...context,
      })
    }

    return new BrewApiError({
      message: withTruncationNote({
        message: `Request failed with status ${String(status)}`,
        bodyError,
      }),
      status,
      code: 'unknown_error',
      type: errorTypeForStatus({ status }),
      param: undefined,
      suggestion: suggestionForStatus({ status }),
      docs: ERRORS_DOCS_URL,
      requestId,
      retryAfter: headerRetryAfter,
      details: undefined,
      body,
      ...context,
    })
  }
}

export class BrewTransportError extends Error {
  readonly method: BrewHttpMethod
  readonly url: string
  readonly attempts: number
  readonly idempotencyKey: string | undefined
  readonly uploadId: string | undefined
  readonly inProgress: boolean

  constructor(init: BrewTransportErrorInit) {
    super(
      init.message,
      init.cause === undefined ? undefined : { cause: init.cause }
    )
    this.name = 'BrewTransportError'
    this.method = init.method
    this.url = init.url
    this.attempts = init.attempts
    this.idempotencyKey = init.idempotencyKey
    this.uploadId = init.uploadId
    this.inProgress = init.inProgress ?? false
  }
}

export class BrewTimeoutError extends BrewTransportError {
  readonly timeoutMs: number

  constructor(init: BrewTimeoutErrorInit) {
    super({
      ...init,
      message: timeoutMessage({ init }),
    })
    this.name = 'TimeoutError'
    this.timeoutMs = init.timeoutMs
  }
}

export class BrewConnectionError extends BrewTransportError {
  constructor(init: BrewConnectionErrorInit) {
    super({
      ...init,
      message: connectionMessage({ init }),
    })
    this.name = 'BrewConnectionError'
  }
}

export class BrewParseError extends Error {
  readonly status: number
  readonly requestId: string | undefined
  readonly idempotencyKey: string | undefined
  readonly uploadId: string | undefined
  readonly bodyPreview: string

  constructor(init: BrewParseErrorInit) {
    super(
      `The response body (status ${String(init.status)}) was not valid JSON.`,
      init.cause === undefined ? undefined : { cause: init.cause }
    )
    this.name = 'BrewParseError'
    this.status = init.status
    this.requestId = init.requestId
    this.idempotencyKey = init.idempotencyKey
    this.uploadId = init.uploadId
    this.bodyPreview = init.bodyPreview
  }
}

type BrewTransportErrorInit = {
  readonly message: string
  readonly method: BrewHttpMethod
  readonly url: string
  readonly attempts: number
  readonly idempotencyKey?: string | undefined
  readonly uploadId?: string | undefined
  readonly inProgress?: boolean | undefined
  readonly cause?: unknown
}

type BrewTimeoutErrorInit = Omit<BrewTransportErrorInit, 'message'> & {
  readonly timeoutMs: number
}

type BrewConnectionErrorInit = Omit<BrewTransportErrorInit, 'message'>

type BrewParseErrorInit = {
  readonly status: number
  readonly requestId?: string | undefined
  readonly idempotencyKey?: string | undefined
  readonly uploadId?: string | undefined
  readonly bodyPreview: string
  readonly cause?: unknown
}

export function runtimeTimeoutCode({
  error,
}: {
  error: unknown
}): string | undefined {
  const cause = error instanceof Error ? error.cause : undefined
  if (!isRecord(cause)) return undefined
  const code = cause.code
  if (code === 'UND_ERR_HEADERS_TIMEOUT' || code === 'UND_ERR_BODY_TIMEOUT') {
    return code
  }
  return undefined
}

function describeRequest({
  method,
  url,
}: {
  method: BrewHttpMethod
  url: string
}): string {
  try {
    const parsed = new URL(url)
    return `${method} ${parsed.origin}${parsed.pathname}`
  } catch {
    return `${method} ${url.split('?')[0] ?? ''}`
  }
}

function attemptsNote({ attempts }: { attempts: number }): string {
  return attempts > 1 ? ` (${String(attempts)} attempts)` : ''
}

const IN_PROGRESS_NOTE =
  ' The server is still processing the first attempt: wait, then replay it with the same idempotencyKey rather than sending it again.'

function timeoutMessage({
  init,
}: {
  readonly init: BrewTimeoutErrorInit
}): string {
  const request = describeRequest(init)
  const runtimeCode = runtimeTimeoutCode({ error: init.cause })
  const what =
    runtimeCode === undefined
      ? `${request} timed out after ${String(init.timeoutMs)}ms${attemptsNote(init)}.`
      : `${request} timed out: the HTTP runtime stopped waiting (${runtimeCode}) before timeoutMs (${String(init.timeoutMs)}ms)${attemptsNote(init)}.`
  return init.inProgress === true ? what + IN_PROGRESS_NOTE : what
}

function connectionMessage({
  init,
}: {
  readonly init: BrewConnectionErrorInit
}): string {
  const reason =
    init.cause instanceof Error && init.cause.message !== ''
      ? `: ${init.cause.message}`
      : ''
  const what = `${describeRequest(init)} failed before a complete response arrived${reason}${attemptsNote(init)}.`
  return init.inProgress === true ? what + IN_PROGRESS_NOTE : what
}

function withTruncationNote({
  message,
  bodyError,
}: {
  message: string
  bodyError: Error | undefined
}): string {
  if (bodyError === undefined) return message
  return `${message} (response body was truncated: ${bodyError.message})`
}

const VALID_ERROR_TYPES: ReadonlySet<BrewErrorType> = new Set<BrewErrorType>([
  'authentication_error',
  'authorization_error',
  'invalid_request',
  'not_found',
  'not_implemented',
  'conflict',
  'rate_limit',
  'payment_required',
  'service_unavailable',
  'internal_error',
])

type ParsedErrorEnvelope = {
  code: string
  type: BrewErrorType | undefined
  message: string
  suggestion: string
  docs: string
  param?: string
  retryAfter?: number
  details?: Record<string, unknown>
}

type ParsedLegacyEnvelope = {
  code: string
  message: string
  details: Record<string, unknown> | undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseErrorEnvelope(body: unknown): ParsedErrorEnvelope | undefined {
  if (body === null || typeof body !== 'object') return undefined

  const wrapper = body as { error?: unknown }
  if (wrapper.error === null || typeof wrapper.error !== 'object') {
    return undefined
  }

  const inner = wrapper.error as Record<string, unknown>

  if (typeof inner.code !== 'string' || inner.code.length === 0) {
    return undefined
  }
  const innerType =
    typeof inner.type === 'string' &&
    VALID_ERROR_TYPES.has(inner.type as BrewErrorType)
      ? (inner.type as BrewErrorType)
      : undefined

  const envelope: ParsedErrorEnvelope = {
    code: inner.code,
    type: innerType,
    message:
      typeof inner.message === 'string'
        ? inner.message
        : `Request failed with code ${inner.code}`,
    suggestion: typeof inner.suggestion === 'string' ? inner.suggestion : '',
    docs: typeof inner.docs === 'string' ? inner.docs : '',
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

function parseLegacyEnvelope({
  body,
}: {
  body: unknown
}): ParsedLegacyEnvelope | undefined {
  if (!isRecord(body)) return undefined
  if (body.success !== false) return undefined
  if (typeof body.code !== 'string' || typeof body.message !== 'string') {
    return undefined
  }
  return {
    code: body.code,
    message: body.message,
    details: isRecord(body.details) ? body.details : undefined,
  }
}

function errorTypeForStatus({ status }: { status: number }): BrewErrorType {
  switch (status) {
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
      return status >= 400 && status < 500
        ? 'invalid_request'
        : 'internal_error'
  }
}

function suggestionForStatus({ status }: { status: number }): string {
  if (isRetryableStatus({ status })) {
    return 'Retry the request. If it keeps failing, contact support.'
  }
  return 'Fix the request before sending it again — the same request fails the same way. See `details` for the specifics when present.'
}

function isRetryableStatus({ status }: { status: number }): boolean {
  return status === 408 || status === 429 || status >= 500
}

function parseRetryAfter(raw: string | null): number | undefined {
  if (raw === null) return undefined
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return undefined
  return parsed
}
