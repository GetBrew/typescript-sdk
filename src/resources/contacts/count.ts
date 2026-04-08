import type { HttpClient } from '../../core/http'

import type { ContactFilter } from './types'

export type CountContactsInput = {
  readonly filters?: ReadonlyArray<ContactFilter>
}

/**
 * Count contacts matching an optional set of filters.
 *
 * The raw API multiplexes `GET /v1/contacts` across list/lookup/count, so
 * the SDK disambiguates by sending `action=count` in the query string.
 * Returns the count as a bare number — the `{ count }` envelope carries
 * no useful metadata beyond the number itself, and forcing callers to
 * write `.count` on every call would hurt DX with zero upside.
 */
export function createCountContacts(client: HttpClient) {
  return async (input: CountContactsInput = {}): Promise<number> => {
    const response = await client.request<{ count: number }>({
      method: 'GET',
      path: '/v1/contacts',
      query: {
        action: 'count',
        filters:
          input.filters === undefined
            ? undefined
            : JSON.stringify(input.filters),
      },
    })
    return response.data.count
  }
}
