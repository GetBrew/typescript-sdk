import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ContactsFilter } from './types'

/**
 * Input to `brew.contacts.count`. Same predicate knobs as `search`
 * (`search`, `filters`, `logic`) minus the pagination/sort fields, which
 * are meaningless when you only want a count.
 */
export type CountContactsInput = {
  readonly search?: string
  readonly filters?: ReadonlyArray<ContactsFilter>
  readonly logic?: components['schemas']['ContactsSearchRequest']['logic']
}

type ContactsCountResponse = components['schemas']['ContactsCountResponse']

/**
 * `POST /v1/contacts/search` with `count: true` (scope: `contacts`) —
 * count contacts matching an optional set of filters.
 *
 * Count moved off `GET /v1/contacts` onto the search endpoint, which
 * returns `{ count }` instead of a page when `count: true`. Returns the
 * count as a bare number — the `{ count }` envelope carries no useful
 * metadata beyond the number itself, and forcing callers to write
 * `.count` would hurt DX with zero upside.
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
    const response = await client.request<ContactsCountResponse>({
      method: 'POST',
      path: '/v1/contacts/search',
      body: { ...input, count: true },
      ...(options ? { options } : {}),
    })
    if (options?.raw === true) {
      return unwrapResponse(
        response,
        options
      ) as BrewRawResponse<ContactsCountResponse>
    }
    return response.data.count
  }
  return count
}
