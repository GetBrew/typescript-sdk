import type { components, paths } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import { flattenFilter } from './_filter'

type GetContactsQuery = NonNullable<
  paths['/v1/contacts']['get']['parameters']['query']
>

/**
 * Input to `brew.contacts.list`. Mirrors the OpenAPI query parameters
 * minus the `email` and `count` mode-switches (those have their own
 * SDK methods, `getByEmail` and `count`).
 *
 * Sourced from the generated query type so any new pagination or
 * filtering knob upstream surfaces as a compile error in the SDK.
 */
export type ListContactsInput = Readonly<
  Pick<
    GetContactsQuery,
    'limit' | 'cursor' | 'search' | 'sort' | 'order' | 'filter'
  >
>

export type ListContactsResponse = components['schemas']['ContactsListResponse']

/**
 * List contacts with optional cursor-based pagination, sort, search, and
 * filter predicates.
 *
 * Filters use the OpenAPI `deepObject` style — `flattenFilter` converts
 * the structured `filter` input into bracket-notation query keys
 * (`filter[subscribed]=true`,
 * `filter[customFields.plan][equals]=enterprise`) before they reach
 * the transport. See `docs/contacts.md` for the full list of supported
 * operator names.
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
    const filterQuery: Record<string, string> =
      input.filter === undefined ? {} : flattenFilter(input.filter)

    const response = await client.request<ListContactsResponse>({
      method: 'GET',
      path: '/v1/contacts',
      query: {
        limit: input.limit,
        cursor: input.cursor,
        search: input.search,
        sort: input.sort,
        order: input.order,
        ...filterQuery,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return list
}
