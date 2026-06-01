import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type DeleteEmailInput = components['schemas']['EmailsDeleteRequest']
export type DeleteEmailResponse = components['schemas']['EmailsDeleteResponse']

/**
 * `DELETE /v1/emails` — hard-delete every version of an email + its
 * grouping rows. Idempotent: an unknown id resolves with
 * `{ deleted: false }`.
 */
export function createDeleteEmail(client: HttpClient) {
  function deleteEmail(
    input: DeleteEmailInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<DeleteEmailResponse>>
  function deleteEmail(
    input: DeleteEmailInput,
    options?: RequestOptions
  ): Promise<DeleteEmailResponse>
  async function deleteEmail(
    input: DeleteEmailInput,
    options?: RequestOptions
  ): Promise<DeleteEmailResponse | BrewRawResponse<DeleteEmailResponse>> {
    const response = await client.request<DeleteEmailResponse>({
      method: 'DELETE',
      path: '/v1/emails',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return deleteEmail
}
