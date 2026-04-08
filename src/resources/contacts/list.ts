import type { HttpClient } from '../../core/http'

import type { Contact, ContactFilter } from './types'

export type ListContactsInput = {
  readonly limit?: number
  readonly cursor?: string
  readonly filters?: ReadonlyArray<ContactFilter>
}

export type ListContactsResponse = {
  readonly contacts: ReadonlyArray<Contact>
  readonly nextCursor?: string
}

/**
 * List contacts with optional cursor-based pagination and filter
 * predicates.
 *
 * Filters are JSON-encoded into a single `filters` query parameter so the
 * wire format stays a plain GET (no body required, which keeps caching
 * proxies and CDN intermediaries happy). When the caller wants to paginate
 * they pass `cursor` from the previous response's `nextCursor`.
 */
export function createListContacts(client: HttpClient) {
  return async (input: ListContactsInput = {}): Promise<ListContactsResponse> => {
    const response = await client.request<ListContactsResponse>({
      method: 'GET',
      path: '/v1/contacts',
      query: {
        limit: input.limit,
        cursor: input.cursor,
        filters:
          input.filters === undefined ? undefined : JSON.stringify(input.filters),
      },
    })
    return response.data
  }
}
