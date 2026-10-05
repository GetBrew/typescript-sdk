import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

type GeneratedAuditRequest = components['schemas']['EmailAuditRequest']
type UnionKeys<T> = T extends unknown ? keyof T : never
type ExclusiveAuditRequest<T = GeneratedAuditRequest> =
  T extends GeneratedAuditRequest
    ? T &
        Partial<
          Record<Exclude<UnionKeys<GeneratedAuditRequest>, keyof T>, never>
        >
    : never

/** Exactly one HTML, JSX, or saved-email source accepted by `POST /v1/emails/audit`. */
export type EmailAuditRequest = ExclusiveAuditRequest

/** Input for `brew.emails.auditEmail(...)`. */
export type AuditEmailInput = EmailAuditRequest

/** Versioned complete or partial audit result. */
export type EmailAuditResponse = components['schemas']['EmailAuditResponse']

/**
 * The server gives the independent provider lanes up to 50 seconds to
 * finish. This ceiling includes enough transport overhead to receive the
 * bounded response while still allowing callers to lower it.
 *
 * It is a floor, never a cap: a longer client-wide `timeoutMs` is kept.
 */
export const AUDIT_EMAIL_DEFAULT_TIMEOUT_MS = 65_000

/**
 * `POST /v1/emails/audit` (scope: `emails`) audits HTML, JSX, or a saved email for
 * production readiness. The audit covers compliance, links, images, loaded
 * size, accessibility, compatibility, markup, subject copy, and preview copy.
 * Choose exactly one of `emailHtml`, `emailJsx`, or `emailId`. Only saved
 * emails accept `emailVersionId`; omitting it selects their latest version.
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
    const response = await client.request<EmailAuditResponse>({
      method: 'POST',
      path: '/v1/emails/audit',
      body: input,
      defaultTimeoutMs: AUDIT_EMAIL_DEFAULT_TIMEOUT_MS,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return auditEmail
}
