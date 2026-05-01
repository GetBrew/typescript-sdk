import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

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
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<{ count: number }>` (the raw wire envelope plus
 * status/headers) instead of the unwrapped number.
 */
export function createCountContacts(client: HttpClient) {
  function count(
    input: CountContactsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ContactsCountResponse>>
  function count(
    input?: CountContactsInput,
    options?: RequestOptions
  ): Promise<number>
  async function count(
    input: CountContactsInput = {},
    options?: RequestOptions
  ): Promise<number | BrewRawResponse<ContactsCountResponse>> {
    const filterQuery: Record<string, string> =
      input.filter === undefined ? {} : flattenFilter(input.filter)

    const response = await client.request<ContactsCountResponse>({
      method: 'GET',
      path: '/v1/contacts',
      query: {
        count: 'true',
        ...filterQuery,
      },
      ...(options ? { options } : {}),
    })
    if (options?.raw === true) {
      return unwrapResponse(response, options) as BrewRawResponse<ContactsCountResponse>
    }
    return response.data.count
  }
  return count
}
