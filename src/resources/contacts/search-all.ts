import { autoPaginate } from '../../core/pagination'
import type { HttpClient } from '../../core/http'
import type { RequestOptions } from '../../types'

import {
  type ContactSearchRow,
  createSearchContacts,
  type SearchContactsInput,
} from './search'

/**
 * Input to `brew.contacts.searchAll(...)`. Same shape as
 * `SearchContactsInput` (search, filters, logic, sort, order, include)
 * but without `cursor` — the iterator owns the cursor state internally
 * and would happily collide with a caller-supplied one.
 *
 * `limit` here is the **per-page** limit (1–100, default 50 per the
 * API). It is not the total cap; iterate the result to stop at any count
 * you want.
 */
export type SearchAllContactsInput = Readonly<
  Omit<SearchContactsInput, 'cursor'>
>

/**
 * Async iterator helper that pages through every contact matching a
 * structured search (`POST /v1/contacts/search`).
 *
 * Behavior:
 * - Yields contacts one at a time (not pages) — each with `openProfile`
 *   when `include: ['openProfile']` asked for it. Use a normal
 *   `for await` loop to walk the entire result set without ever seeing
 *   pagination state.
 * - Internally calls `search` repeatedly and follows `pagination.cursor`
 *   until `pagination.hasMore` is `false`.
 * - Honors `options.signal` between pages — the iterator stops reading
 *   new pages once the caller aborts. Pages already returned from
 *   `search` are still yielded by the loop, but no further fetches are
 *   issued.
 *
 * This is the filtered counterpart to `brew.contacts.listAll`: filtering
 * moved off the list query onto the search endpoint, so any iteration
 * that needs filters/search/sort goes through here.
 *
 * Example:
 * ```ts
 * for await (const contact of brew.contacts.searchAll({
 *   filters: [{ field: 'subscribed', operator: 'equals', value: 'true' }],
 * })) {
 *   console.log(contact.email)
 * }
 * ```
 */
export function createSearchAllContacts(client: HttpClient) {
  const search = createSearchContacts(client)

  return function searchAllContacts(
    input: SearchAllContactsInput = {},
    options?: RequestOptions
  ): AsyncGenerator<ContactSearchRow, void, void> {
    return autoPaginate<ContactSearchRow>(
      async (cursor) => {
        const pageInput: SearchContactsInput = {
          ...input,
          ...(cursor !== null ? { cursor } : {}),
        }
        const response = await search(pageInput, options)
        return { items: response.data, pagination: response.pagination }
      },
      options?.signal ? { signal: options.signal } : undefined
    )
  }
}
