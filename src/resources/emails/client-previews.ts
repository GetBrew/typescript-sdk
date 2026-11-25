import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type PreviewEmailClientsInput = {
  readonly emailId: string
} & components['schemas']['EmailClientPreviewRequest']

export type EmailClientPreviewResponse =
  components['schemas']['EmailClientPreviewResponse']

export const PREVIEW_EMAIL_CLIENTS_DEFAULT_TIMEOUT_MS = 90_000

export function createPreviewEmailClients(client: HttpClient) {
  function previewClients(
    input: PreviewEmailClientsInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<EmailClientPreviewResponse>>
  function previewClients(
    input: PreviewEmailClientsInput,
    options?: RequestOptions
  ): Promise<EmailClientPreviewResponse>
  async function previewClients(
    input: PreviewEmailClientsInput,
    options?: RequestOptions
  ): Promise<
    EmailClientPreviewResponse | BrewRawResponse<EmailClientPreviewResponse>
  > {
    const { emailId, ...body } = input
    const response = await client.request<EmailClientPreviewResponse>({
      method: 'POST',
      path: `/v1/emails/${encodeURIComponent(emailId)}/client-previews`,
      body,
      defaultTimeoutMs: PREVIEW_EMAIL_CLIENTS_DEFAULT_TIMEOUT_MS,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return previewClients
}
