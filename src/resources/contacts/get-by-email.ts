import type { HttpClient } from '../../core/http'

import type { Contact } from './types'

export type GetContactByEmailInput = {
  readonly email: string
}

/**
 * Look up a single contact by email.
 *
 * Hits the multiplexed `GET /v1/contacts?email=...` endpoint and unwraps
 * the `{ contact }` envelope so callers get a bare `Contact`. If the
 * contact does not exist the transport throws a `BrewApiError` with code
 * `CONTACT_NOT_FOUND` — the resource layer does not try to translate
 * that into `undefined`, because silent-null on not-found is a footgun
 * in typed clients.
 */
export function createGetContactByEmail(client: HttpClient) {
  return async (input: GetContactByEmailInput): Promise<Contact> => {
    const response = await client.request<{ contact: Contact }>({
      method: 'GET',
      path: '/v1/contacts',
      query: { email: input.email },
    })
    return response.data.contact
  }
}
