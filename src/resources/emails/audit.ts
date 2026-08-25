import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/** Raw email content accepted by `POST /v1/emails/audit`. */
export type EmailAuditRequest = components['schemas']['EmailAuditRequest']

/** Input for `brew.emails.auditEmail(...)`. */
export type AuditEmailInput = EmailAuditRequest

/** Versioned complete or partial audit result. */
export type EmailAuditResponse = components['schemas']['EmailAuditResponse']

/**
 * The server gives the independent provider lanes up to 50 seconds to
 * finish. This ceiling includes enough transport overhead to receive the
 * bounded response while still allowing callers to lower it.
 */
export const AUDIT_EMAIL_DEFAULT_TIMEOUT_MS = 65_000

/**
 * `POST /v1/emails/audit` (scope: `emails`) lints raw email content for
 * production readiness. The audit covers compliance, links, images, loaded
 * size, accessibility, compatibility, markup, subject copy, and preview copy.
 *
 * Branch on `completion.status`. A complete result has a numeric score and
 * costs 5 credits. A partial result has `score: null`, costs 0 credits, and
 * can be retried with the same idempotency key. Pass `{ raw: true }` to read
 * `X-Credit-Cost` and the other response headers.
 */
export function createAuditEmail(client: HttpClient) {
  function auditEmail(
    input: AuditEmailInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<EmailAuditResponse>>
  function auditEmail(
    input: AuditEmailInput,
    options?: RequestOptions
  ): Promise<EmailAuditResponse>
  async function auditEmail(
    input: AuditEmailInput,
    options?: RequestOptions
  ): Promise<EmailAuditResponse | BrewRawResponse<EmailAuditResponse>> {
    const resolvedOptions: RequestOptions = {
      ...(options ?? {}),
      timeoutMs: options?.timeoutMs ?? AUDIT_EMAIL_DEFAULT_TIMEOUT_MS,
    }
    const response = await client.request<EmailAuditResponse>({
      method: 'POST',
      path: '/v1/emails/audit',
      body: input,
      options: resolvedOptions,
    })
    return unwrapResponse(response, resolvedOptions)
  }
  return auditEmail
}
