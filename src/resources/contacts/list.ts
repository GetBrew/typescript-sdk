import type { components, operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/**
 * Input to `brew.contacts.list`. The `GET /v1/contacts` query is now
 * pagination-ONLY — `limit` (1–100, default 50) and `cursor` are the
 * only knobs. Search, typed filters, sort, and count moved to
 * `brew.contacts.search` (`POST /v1/contacts/search`).
 *
 * Sourced from the generated query type so any new pagination knob
 * upstream surfaces as a compile error in the SDK.
 */
export type ListContactsInput = Readonly<
  NonNullable<operations['listContacts']['parameters']['query']>
>

/** The uniform `{ data, pagination }` page returned by `GET /v1/contacts`. */
export type ListContactsResponse = components['schemas']['ContactsListResponse']

/**
 * `GET /v1/contacts` (scope: `contacts`) — list contacts newest-first
 * under the uniform `{ data, pagination }` envelope with native
 * cursor-based pagination.
 *
 * This endpoint no longer accepts search / filter / sort params. Use
 * `brew.contacts.search` for structured queries and
 * `brew.contacts.searchAll` to iterate a filtered result set.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ListContactsResponse>` instead of the unwrapped
 * envelope.
 */
export function createListContacts(client: HttpClient) {
  function list(
    input: ListContactsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListContactsResponse>>
  function list(
    input?: ListContactsInput,
    options?: RequestOptions
  ): Promise<ListContactsResponse>
  async function list(
    input: ListContactsInput = {},
    options?: RequestOptions
  ): Promise<ListContactsResponse | BrewRawResponse<ListContactsResponse>> {
    const response = await client.request<ListContactsResponse>({
      method: 'GET',
      path: '/v1/contacts',
      query: {
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return list
}
