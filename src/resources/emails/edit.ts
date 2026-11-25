import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type EditEmailInput = {
  readonly emailId: string
} & components['schemas']['EmailEditRequest']

export type EditEmailResponse = components['schemas']['EmailGenerateResponse']

export const EDIT_EMAIL_DEFAULT_TIMEOUT_MS = 240_000

export function createEditEmail(client: HttpClient) {
  function editEmail(
    input: EditEmailInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<EditEmailResponse>>
  function editEmail(
    input: EditEmailInput,
    options?: RequestOptions
  ): Promise<EditEmailResponse>
  async function editEmail(
    input: EditEmailInput,
    options?: RequestOptions
  ): Promise<EditEmailResponse | BrewRawResponse<EditEmailResponse>> {
    const { emailId, ...body } = input
    const response = await client.request<EditEmailResponse>({
      method: 'PATCH',
      path: `/v1/emails/${encodeURIComponent(emailId)}`,
      body,
      defaultTimeoutMs: EDIT_EMAIL_DEFAULT_TIMEOUT_MS,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return editEmail
}
