import type { components, operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ContactsFilter } from './types'

type ContactsSearchRequest = components['schemas']['ContactsSearchRequest']

/**
 * Input to `brew.contacts.search` (`POST /v1/contacts/search`) — the
 * canonical contacts read. Every field is optional here even though the
 * spec marks several required — the server fills the documented defaults
 * (`filters: []`, `logic: 'and'`, `sort: 'createdAt'`, `order: 'desc'`,
 * `limit: 50`) when a key is omitted, so forcing callers to spell them
 * out would only hurt DX.
 *
 * Pass `audienceId` to scope the search to the members of a saved
 * audience (combined with any `filters` / `search`).
 *
 * `count` is intentionally NOT exposed here — `search` always returns a
 * page. Use `brew.contacts.count` for the `count: true` mode (the API
 * refuses `include` with `count: true`, so the count inputs have none).
 *
 * Sourced from the generated request schema so any new search knob
 * upstream surfaces as a compile error in the SDK.
 */
export type SearchContactsInput = {
  readonly search?: ContactsSearchRequest['search']
  readonly filters?: ReadonlyArray<ContactsFilter>
  /** Scope the search to the members of a saved audience. */
  readonly audienceId?: ContactsSearchRequest['audienceId']
  readonly logic?: ContactsSearchRequest['logic']
  readonly sort?: ContactsSearchRequest['sort']
  readonly order?: ContactsSearchRequest['order']
  readonly limit?: ContactsSearchRequest['limit']
  readonly cursor?: ContactsSearchRequest['cursor']
  /**
   * `['openProfile']` attaches each returned contact's smart-send open-time
   * profile (`openProfile`, as on `get`; `null` when they have no opens
   * yet). Each row costs one profile read, so a page then holds at most 10
   * contacts (`pagination.limit` reports the size read). It needs the
   * `emails` scope as well (`403 INSUFFICIENT_PERMISSIONS` without it).
   */
  readonly include?: ReadonlyArray<
    NonNullable<ContactsSearchRequest['include']>[number]
  >
}

/** The page arms of `POST /v1/contacts/search` (not the `{ count }` arm). */
type SearchContactsPage = Extract<
  operations['searchContacts']['responses'][200]['content']['application/json'],
  { readonly data: unknown }
>

/**
 * The page arm whose rows can carry `openProfile`. A plain page's rows
 * are the same contacts without it, so this one types both answers, and
 * `row.openProfile` reads on every row instead of only after narrowing.
 */
type PageWithOpenProfile<Page> = Page extends {
  readonly data: ReadonlyArray<infer Row>
}
  ? 'openProfile' extends keyof Row
    ? Page
    : never
  : never

/**
 * A page of matching contacts under the uniform `{ data, pagination }`
 * envelope — each row with `openProfile` when `include` asked for it.
 * Derived from the generated `searchContacts` operation (its page arm, not
 * the `{ count }` arm that `count` / `countBy` read), so it follows the
 * response schemas the route actually declares.
 */
export type SearchContactsResponse = PageWithOpenProfile<SearchContactsPage>

/** One contact on a `search` page (and what `searchAll` yields). */
export type ContactSearchRow = SearchContactsResponse['data'][number]

/**
 * `POST /v1/contacts/search` (scope: `contacts`) — the canonical
 * contacts read. Structured search over the brand's contacts: free-text
 * `search`, typed `filters` (`{ field, operator, value }` combined by
 * `logic`), an optional `audienceId` scope, `sort` + `order`, and cursor
 * pagination. Returns the uniform `{ data, pagination }` page.
 *
 * Pass an empty body (`{}`) to read every contact newest-first — search,
 * filters, and sort are all opt-in. `include: ['openProfile']` attaches
 * each row's open-time profile (at most 10 rows a page; needs the
 * `emails` scope as well, `403 INSUFFICIENT_PERMISSIONS` without it). To
 * walk every match use `brew.contacts.searchAll`; to get just a count use
 * `brew.contacts.count`. Look one contact up by email with a
 * `{ field: 'email', operator: 'equals', value }` filter.
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
