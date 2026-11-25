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

export type EmailAuditRequest = ExclusiveAuditRequest

export type AuditEmailInput = EmailAuditRequest

export type EmailAuditResponse = components['schemas']['EmailAuditResponse']

export const AUDIT_EMAIL_DEFAULT_TIMEOUT_MS = 65_000

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
