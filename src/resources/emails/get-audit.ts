import type { operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/** Paging for `brew.emails.getAudit(...)` plus the standard options. */
export type GetEmailAuditOptions = RequestOptions & {
  /** `pagination.cursor` from the previous page. */
  readonly cursor?: string
  /** Findings per page, 1-100 (server default 100). */
  readonly limit?: number
}

/** One page of a saved audit: its findings, summary, checks and policy. */
export type GetEmailAuditResponse =
  operations['getEmailAudit']['responses'][200]['content']['application/json']

/**
 * `GET /v1/emails/audits/{auditId}` (scope: `emails`) — read one page of a
 * saved audit's findings (ids, rule ids, targets, remediation and the
 * audited `contentHash`). Reading is free and never reruns the audit;
 * continue with `pagination.cursor`. Reports are kept for seven days; an
 * expired or unknown id is `404 AUDIT_NOT_FOUND`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetEmailAuditResponse>` instead of the unwrapped page.
 */
export function createGetEmailAudit(client: HttpClient) {
  function getEmailAudit(
    auditId: string,
    options: GetEmailAuditOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetEmailAuditResponse>>
  function getEmailAudit(
    auditId: string,
    options?: GetEmailAuditOptions
  ): Promise<GetEmailAuditResponse>
  async function getEmailAudit(
    auditId: string,
    options?: GetEmailAuditOptions
  ): Promise<GetEmailAuditResponse | BrewRawResponse<GetEmailAuditResponse>> {
    const query = {
      ...(options?.cursor !== undefined ? { cursor: options.cursor } : {}),
      ...(options?.limit !== undefined ? { limit: options.limit } : {}),
    }
    const response = await client.request<GetEmailAuditResponse>({
      method: 'GET',
      path: `/v1/emails/audits/${encodeURIComponent(auditId)}`,
      ...(Object.keys(query).length > 0 ? { query } : {}),
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getEmailAudit
}
