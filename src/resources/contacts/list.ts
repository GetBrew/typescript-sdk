import type { components, operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/** Query params accepted by `brew.contacts.list(...)`. */
export type ListContactsInput = NonNullable<
  operations['listContacts']['parameters']['query']
>

/** A page of contacts under the uniform `{ data, pagination }` envelope. */
export type ListContactsResponse = components['schemas']['ContactsListResponse']

/**
 * `GET /v1/contacts` (scope: `contacts`) — the brand's contacts, newest
 * first, under the uniform `{ data, pagination }` envelope.
 *
 * The simple read: free-text `search`, an `audienceId` scope, `sort` +
 * `order`, and cursor pagination. Reach for
 * `brew.contacts.search(...)` when you need typed `filters` combined by
 * `logic`, and `brew.contacts.get(email)` for one contact.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ListContactsResponse>` instead of the unwrapped
 * envelope.
 */
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
