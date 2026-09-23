import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Contact } from './types'

/** `GET /v1/contacts/{email}` returns the BARE `Contact` row. */
export type GetContactResponse = Contact

/**
 * `GET /v1/contacts/{email}` (scope: `contacts`) — one contact by email
 * address, returned as the BARE row: core columns, consent record,
 * validation verdict, suppression state, and `customFields`.
 *
 * An email with no contact is `404 CONTACT_NOT_FOUND` — you no longer
 * have to look one up with a `{ field: 'email', operator: 'equals' }`
 * search and test for an empty page.
 *
 * The address is URL-encoded for you, so `a+b@example.com` works as
 * written.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetContactResponse>` instead of the unwrapped row.
 */
export function createGetContact(client: HttpClient) {
  function getContact(
    email: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetContactResponse>>
  function getContact(
    email: string,
    options?: RequestOptions
  ): Promise<GetContactResponse>
  async function getContact(
    email: string,
    options?: RequestOptions
  ): Promise<GetContactResponse | BrewRawResponse<GetContactResponse>> {
    const response = await client.request<GetContactResponse>({
      method: 'GET',
      path: `/v1/contacts/${encodeURIComponent(email)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getContact
}
