import type { components } from '../../generated/openapi-types'
import type { HttpClient } from '../../core/http'

import { flattenFilter } from './_filter'
import type { ContactsFilter } from './types'

export type CountContactsInput = {
  readonly filter?: ContactsFilter
}

type ContactsCountResponse = components['schemas']['ContactsCountResponse']

/**
 * Count contacts matching an optional set of filters.
 *
 * The raw API multiplexes `GET /v1/contacts` across list/lookup/count, so
 * the SDK disambiguates by sending `count=true` in the query string per
 * the OpenAPI spec. Returns the count as a bare number — the
 * `{ count }` envelope carries no useful metadata beyond the number
 * itself, and forcing callers to write `.count` would hurt DX with zero
 * upside.
 */
export function createCountContacts(client: HttpClient) {
  return async (input: CountContactsInput = {}): Promise<number> => {
    const filterQuery: Record<string, string> =
      input.filter === undefined ? {} : flattenFilter(input.filter)

    const response = await client.request<ContactsCountResponse>({
      method: 'GET',
      path: '/v1/contacts',
      query: {
        count: 'true',
        ...filterQuery,
      },
    })
    return response.data.count
  }
}
