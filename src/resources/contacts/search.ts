import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ContactsFilter } from './types'

type ContactsSearchRequest = components['schemas']['ContactsSearchRequest']

/**
 * Input to `brew.contacts.search` (`POST /v1/contacts/search`). Every
 * field is optional here even though the spec marks several required —
 * the server fills the documented defaults (`filters: []`, `logic:
 * 'and'`, `sort: 'createdAt'`, `order: 'desc'`, `limit: 50`) when a key
 * is omitted, so forcing callers to spell them out would only hurt DX.
 *
 * `count` is intentionally NOT exposed here — `search` always returns a
 * page. Use `brew.contacts.count` for the `count: true` mode.
 *
 * Sourced from the generated request schema so any new search knob
 * upstream surfaces as a compile error in the SDK.
 */
export type SearchContactsInput = {
  readonly search?: ContactsSearchRequest['search']
  readonly filters?: ReadonlyArray<ContactsFilter>
  readonly logic?: ContactsSearchRequest['logic']
  readonly sort?: ContactsSearchRequest['sort']
  readonly order?: ContactsSearchRequest['order']
  readonly limit?: ContactsSearchRequest['limit']
  readonly cursor?: ContactsSearchRequest['cursor']
}

/** A page of matching contacts under the uniform `{ data, pagination }` envelope. */
export type SearchContactsResponse =
  components['schemas']['ContactsListResponse']

/**
 * `POST /v1/contacts/search` (scope: `contacts`) — structured search over
 * the brand's contacts: free-text `search`, typed `filters` (`{ field,
 * operator, value }` combined by `logic`), `sort` + `order`, and
 * cursor pagination. Returns the same `{ data, pagination }` page as
 * `list`.
 *
 * This replaces the old `GET /v1/contacts?filter=...` query style — the
 * filter, search, and sort knobs all live in the request body now. To
 * walk every match use `brew.contacts.searchAll`; to get just a count
 * use `brew.contacts.count`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<SearchContactsResponse>` instead of the unwrapped
 * envelope.
 */
export function createSearchContacts(client: HttpClient) {
  function search(
    input: SearchContactsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<SearchContactsResponse>>
  function search(
    input?: SearchContactsInput,
    options?: RequestOptions
  ): Promise<SearchContactsResponse>
  async function search(
    input: SearchContactsInput = {},
    options?: RequestOptions
  ): Promise<SearchContactsResponse | BrewRawResponse<SearchContactsResponse>> {
    const response = await client.request<SearchContactsResponse>({
      method: 'POST',
      path: '/v1/contacts/search',
      body: { ...input, count: false },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return search
}
