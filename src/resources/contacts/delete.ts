import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type DeleteContactInput = {
  readonly email: string
}

export type DeleteContactResponse =
  components['schemas']['ContactDeleteResponse']

export function createDeleteContact(client: HttpClient) {
  function deleteContact(
    input: DeleteContactInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<DeleteContactResponse>>
  function deleteContact(
    input: DeleteContactInput,
    options?: RequestOptions
  ): Promise<DeleteContactResponse>
  async function deleteContact(
    input: DeleteContactInput,
    options?: RequestOptions
  ): Promise<DeleteContactResponse | BrewRawResponse<DeleteContactResponse>> {
    const response = await client.request<DeleteContactResponse>({
      method: 'DELETE',
      path: `/v1/contacts/${encodeURIComponent(input.email)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return deleteContact
}
