import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type CloneEmailInput = {
  readonly emailId: string
} & components['schemas']['EmailCloneRequest']

export type CloneEmailResponse =
  components['schemas']['EmailGenerateGeneratedResponse']

export function createCloneEmail(client: HttpClient) {
  function cloneEmail(
    input: CloneEmailInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<CloneEmailResponse>>
  function cloneEmail(
    input: CloneEmailInput,
    options?: RequestOptions
  ): Promise<CloneEmailResponse>
  async function cloneEmail(
    input: CloneEmailInput,
    options?: RequestOptions
  ): Promise<CloneEmailResponse | BrewRawResponse<CloneEmailResponse>> {
    const { emailId, ...body } = input
    const response = await client.request<CloneEmailResponse>({
      method: 'POST',
      path: `/v1/emails/${encodeURIComponent(emailId)}/clone`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return cloneEmail
}
