import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type DeleteManyContactsInput = {
  readonly emails: ReadonlyArray<string>
}

export type DeleteManyContactsResponse =
  components['schemas']['ContactsBatchDeleteResponse']

export function createDeleteManyContacts(client: HttpClient) {
  function deleteMany(
    input: DeleteManyContactsInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<DeleteManyContactsResponse>>
  function deleteMany(
    input: DeleteManyContactsInput,
    options?: RequestOptions
  ): Promise<DeleteManyContactsResponse>
  async function deleteMany(
    input: DeleteManyContactsInput,
    options?: RequestOptions
  ): Promise<
    DeleteManyContactsResponse | BrewRawResponse<DeleteManyContactsResponse>
  > {
    const response = await client.request<DeleteManyContactsResponse>({
      method: 'POST',
      path: '/v1/contacts/batch-delete',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return deleteMany
}
