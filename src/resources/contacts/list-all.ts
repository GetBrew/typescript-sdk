import { autoPaginate } from '../../core/pagination'
import type { HttpClient } from '../../core/http'
import type { RequestOptions } from '../../types'

import type { Contact } from './types'
import { createListContacts, type ListContactsInput } from './list'

/**
 * Input to `brew.contacts.listAll(...)`. Same shape as
 * `ListContactsInput` (filters, search, sort, order) but without
 * `cursor` — the iterator owns the cursor state internally and would
 * happily collide with a caller-supplied one.
 *
 * `limit` here is the **per-page** limit (1–100, default 50 per the
 * API). It is not the total cap; iterate the result to stop at any
 * count you want.
 */
export type ListAllContactsInput = Readonly<Omit<ListContactsInput, 'cursor'>>

/**
 * Async iterator helper that pages through every matching contact.
 *
 * Behavior:
 * - Yields `Contact` objects one at a time (not pages). Use a normal
 *   `for await` loop to walk the entire result set without ever seeing
 *   pagination state.
 * - Internally calls `list` repeatedly and follows `pagination.cursor`
 *   until `pagination.hasMore` is `false`.
 * - Honors `options.signal` between pages — the iterator stops
 *   reading new pages once the caller aborts. Pages already returned
 *   from `list` are still yielded by the loop, but no further fetches
 *   are issued.
 *
 * Example:
 * ```ts
 * for await (const contact of brew.contacts.listAll({ search: 'jane' })) {
 *   console.log(contact.email)
 * }
 * ```
 */
export function createListAllContacts(client: HttpClient) {
  const list = createListContacts(client)

  return function listAllContacts(
    input: ListAllContactsInput = {},
    options?: RequestOptions
  ): AsyncGenerator<Contact, void, void> {
    return autoPaginate<Contact>(
      async (cursor) => {
        const pageInput: ListContactsInput = {
          ...input,
          ...(cursor !== null ? { cursor } : {}),
        }
        const response = await list(pageInput, options)
        return { items: response.contacts, pagination: response.pagination }
      },
      options?.signal ? { signal: options.signal } : undefined
    )
  }
}
