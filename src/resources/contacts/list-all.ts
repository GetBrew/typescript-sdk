import type { HttpClient } from '../../core/http'
import type { RequestOptions } from '../../types'

import type { Contact } from './types'
import {
  createListContacts,
  type ListContactsInput,
  type ListContactsResponse,
} from './list'

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
export type ListAllContactsInput = Readonly<
  Omit<ListContactsInput, 'cursor'>
>

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

  return async function* listAllContacts(
    input: ListAllContactsInput = {},
    options?: RequestOptions
  ): AsyncGenerator<Contact, void, void> {
    /* eslint-disable no-await-in-loop --
     * Sequential awaits are intentional: each page must come back from
     * the server before we know the cursor for the next page, so
     * parallelizing the requests is not even possible. The whole point
     * of this loop is to issue requests strictly in order.
     */
    let cursor: string | null = null
    while (true) {
      if (options?.signal?.aborted === true) {
        return
      }

      const pageInput: ListContactsInput = {
        ...input,
        ...(cursor !== null ? { cursor } : {}),
      }

      const response: ListContactsResponse = await list(pageInput, options)

      for (const contact of response.contacts) {
        yield contact
      }

      if (!response.pagination.hasMore || response.pagination.cursor === null) {
        return
      }

      cursor = response.pagination.cursor
    }
    /* eslint-enable no-await-in-loop */
  }
}
