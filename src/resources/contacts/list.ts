import type { components, operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type ListContactsInput = NonNullable<
  operations['listContacts']['parameters']['query']
>

export type ListContactsResponse = components['schemas']['ContactsListResponse']

export function createListContacts(client: HttpClient) {
  function listContacts(
    input: ListContactsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListContactsResponse>>
  function listContacts(
    input?: ListContactsInput,
    options?: RequestOptions
  ): Promise<ListContactsResponse>
  async function listContacts(
    input: ListContactsInput = {},
    options?: RequestOptions
  ): Promise<ListContactsResponse | BrewRawResponse<ListContactsResponse>> {
    const response = await client.request<ListContactsResponse>({
      method: 'GET',
      path: '/v1/contacts',
      query: {
        search: input.search,
        audienceId: input.audienceId,
        sort: input.sort,
        order: input.order,
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listContacts
}
