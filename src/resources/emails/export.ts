import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type ExportEmailInput = {
  readonly emailId: string
} & components['schemas']['EmailExportRequest']

export type ExportEmailResponse = components['schemas']['EmailExportResponse']

export type ExportProvider = ExportEmailResponse['provider']

export const EXPORT_EMAIL_DEFAULT_TIMEOUT_MS = 800_000

export function createExportEmail(client: HttpClient) {
  function exportEmail(
    input: ExportEmailInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ExportEmailResponse>>
  function exportEmail(
    input: ExportEmailInput,
    options?: RequestOptions
  ): Promise<ExportEmailResponse>
  async function exportEmail(
    input: ExportEmailInput,
    options?: RequestOptions
  ): Promise<ExportEmailResponse | BrewRawResponse<ExportEmailResponse>> {
    const { emailId, ...body } = input
    const response = await client.request<ExportEmailResponse>({
      method: 'POST',
      path: `/v1/emails/${encodeURIComponent(emailId)}/export`,
      body,
      defaultTimeoutMs: EXPORT_EMAIL_DEFAULT_TIMEOUT_MS,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return exportEmail
}
