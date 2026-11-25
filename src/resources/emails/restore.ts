import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type RestoreEmailInput = {
  readonly emailId: string
} & components['schemas']['EmailRestoreRequest']

export type RestoreEmailResponse =
  components['schemas']['EmailGenerateGeneratedResponse']

export function createRestoreEmail(client: HttpClient) {
  function restoreEmail(
    input: RestoreEmailInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<RestoreEmailResponse>>
  function restoreEmail(
    input: RestoreEmailInput,
    options?: RequestOptions
  ): Promise<RestoreEmailResponse>
  async function restoreEmail(
    input: RestoreEmailInput,
    options?: RequestOptions
  ): Promise<RestoreEmailResponse | BrewRawResponse<RestoreEmailResponse>> {
    const { emailId, ...body } = input
    const response = await client.request<RestoreEmailResponse>({
      method: 'POST',
      path: `/v1/emails/${encodeURIComponent(emailId)}/restore`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return restoreEmail
}
