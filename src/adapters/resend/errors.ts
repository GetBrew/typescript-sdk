import { BrewApiError, BrewInputError, BrewTransportError } from '@brew.new/sdk'

/**
 * Resend's error names this adapter answers with, plus two of Brew's own:
 * `brew_template_required` (an `html` / `react` / `text` send: Brew sends
 * app email from templates) and `brew_unsupported_field` (a field Brew has
 * no equivalent for, such as `cc` or `attachments`).
 */
export type ResendCompatErrorName =
  | 'validation_error'
  | 'missing_api_key'
  | 'invalid_api_key'
  | 'restricted_api_key'
  | 'not_found'
  | 'rate_limit_exceeded'
  | 'daily_quota_exceeded'
  | 'monthly_quota_exceeded'
  | 'invalid_idempotent_request'
  | 'concurrent_idempotent_requests'
  | 'application_error'
  | 'brew_template_required'
  | 'brew_unsupported_field'

/**
 * Resend's `{ name, message, statusCode }`, plus the Brew error `code` and
 * `requestId` when the API answered (share the request id with support).
 */
export type ResendCompatError = {
  readonly name: ResendCompatErrorName
  readonly message: string
  readonly statusCode: number | null
  readonly brewCode?: string
  readonly requestId?: string
}

export function resendError(
  name: ResendCompatErrorName,
  message: string,
  statusCode: number | null = 422
): ResendCompatError {
  return { name, message, statusCode }
}

const NAME_BY_CODE: Readonly<Record<string, ResendCompatErrorName>> = {
  AUTHENTICATION_REQUIRED: 'missing_api_key',
  INSUFFICIENT_PERMISSIONS: 'restricted_api_key',
  INSUFFICIENT_ROLE: 'restricted_api_key',
  SANDBOX_DAILY_LIMIT: 'daily_quota_exceeded',
  SEND_QUOTA_EXCEEDED: 'monthly_quota_exceeded',
  IDEMPOTENCY_CONFLICT: 'invalid_idempotent_request',
  IDEMPOTENCY_IN_PROGRESS: 'concurrent_idempotent_requests',
}

function nameForStatus(status: number): ResendCompatErrorName {
  if (status === 401 || status === 403) {
    return 'invalid_api_key'
  }
  if (status === 404) {
    return 'not_found'
  }
  if (status === 429) {
    return 'rate_limit_exceeded'
  }
  if (status >= 400 && status < 500) {
    return 'validation_error'
  }
  return 'application_error'
}

/**
 * Map anything a send can throw to Resend's error shape. A refused request
 * (`BrewApiError`) keeps its status and Brew code; an input the SDK refuses
 * before sending (`BrewInputError`, such as a blank `idempotencyKey`) is a
 * `validation_error`, like the adapter's own checks; no answer at all (a
 * timeout or a dropped connection) and anything unexpected is
 * `application_error` with `statusCode: null`.
 */
export function toResendError(error: unknown): ResendCompatError {
  if (error instanceof BrewInputError) {
    return resendError('validation_error', error.message)
  }
  if (error instanceof BrewApiError) {
    const name = NAME_BY_CODE[error.code] ?? nameForStatus(error.status)
    return {
      name,
      message: error.message,
      statusCode: error.status,
      brewCode: error.code,
      ...(error.requestId === undefined ? {} : { requestId: error.requestId }),
    }
  }
  if (error instanceof BrewTransportError) {
    return resendError('application_error', error.message, null)
  }
  const message = error instanceof Error ? error.message : String(error)
  return resendError('application_error', message, null)
}
