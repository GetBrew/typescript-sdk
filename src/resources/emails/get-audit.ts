import type { operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type GetEmailAuditOptions = RequestOptions & {
  readonly cursor?: string
  readonly limit?: number
}

export type GetEmailAuditResponse =
  operations['getEmailAudit']['responses'][200]['content']['application/json']

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
