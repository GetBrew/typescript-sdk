import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Contact } from './types'

export type GetContactByEmailInput = {
  readonly email: string
}

type ContactsLookupEnvelope = { readonly contact: Contact }

/**
 * Look up a single contact by email.
 *
 * Hits the multiplexed `GET /v1/contacts?email=...` endpoint and unwraps
 * the `{ contact }` envelope so callers get a bare `Contact`. If the
 * contact does not exist the transport throws a `BrewApiError` with code
 * `CONTACT_NOT_FOUND` — the resource layer does not try to translate
 * that into `undefined`, because silent-null on not-found is a footgun
 * in typed clients.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<{ contact: Contact }>` (the raw wire envelope plus
 * status/headers) instead of the unwrapped `Contact`.
 */
export function createGetContactByEmail(client: HttpClient) {
  function getByEmail(
    input: GetContactByEmailInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ContactsLookupEnvelope>>
  function getByEmail(
    input: GetContactByEmailInput,
    options?: RequestOptions
  ): Promise<Contact>
  async function getByEmail(
    input: GetContactByEmailInput,
    options?: RequestOptions
  ): Promise<Contact | BrewRawResponse<ContactsLookupEnvelope>> {
    const response = await client.request<ContactsLookupEnvelope>({
      method: 'GET',
      path: '/v1/contacts',
      query: { email: input.email },
      ...(options ? { options } : {}),
    })
    if (options?.raw === true) {
      return unwrapResponse(response, options) as BrewRawResponse<ContactsLookupEnvelope>
    }
    return response.data.contact
  }
  return getByEmail
}
