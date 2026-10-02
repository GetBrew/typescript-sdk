import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/**
 * Body of `POST /v1/emails/audit`: exactly one source — rendered
 * `emailHtml`, a React Email `emailJsx` module, or a saved design's
 * `emailId` (plus `emailVersionId` to pin a version) — with the optional
 * `subject`, `previewText` and `sendingPurpose`.
 */
export type EmailAuditRequest = components['schemas']['EmailAuditRequest']

/** Input for `brew.emails.auditEmail(...)`. */
export type AuditEmailInput = EmailAuditRequest

/** Versioned complete or partial audit result. */
export type EmailAuditResponse = components['schemas']['EmailAuditResponse']

/**
 * The server runs every check in parallel within a 25-second budget. This
 * ceiling adds room to render a JSX or saved-design source and receive the
 * bounded response while still allowing callers to lower it.
 *
 * It is a floor, never a cap: a longer client-wide `timeoutMs` is kept.
 */
export const AUDIT_EMAIL_DEFAULT_TIMEOUT_MS = 40_000

/**
 * `POST /v1/emails/audit` (scope: `emails`) audits an email for production
 * readiness: links and images (fetched by Brew), unsubscribe and postal
 * compliance, loaded size, email-client support, accessibility, markup, and
 * link text, alt text, subject and preview copy judged by an evaluation
 * model. Each finding's `evidence` names what supports it. Omit
 * `sendingPurpose` and the audit infers it (`policy.source: 'inferred'`).
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
