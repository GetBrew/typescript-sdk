import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Contact } from './types'

export type GetContactByEmailInput = {
  readonly email: string
}

/**
 * `GET /v1/contacts/{email}` (scope: `contacts`) — look up a single
 * contact by email.
 *
 * Email is the contact primary key and now travels in the path (not a
 * `?email=` query param). The endpoint returns the bare `Contact` row
 * directly — there is no `{ contact }` envelope anymore. If the contact
 * does not exist the transport throws a `BrewApiError` with code
 * `CONTACT_NOT_FOUND`; the resource layer does not translate that into
 * `undefined`, because silent-null on not-found is a footgun in typed
 * clients.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<Contact>` (the contact plus status/headers) instead
 * of the unwrapped `Contact`.
 */
export function createGetContactByEmail(client: HttpClient) {
  function getByEmail(
    input: GetContactByEmailInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<Contact>>
  function getByEmail(
    input: GetContactByEmailInput,
    options?: RequestOptions
  ): Promise<Contact>
  async function getByEmail(
    input: GetContactByEmailInput,
    options?: RequestOptions
  ): Promise<Contact | BrewRawResponse<Contact>> {
    const response = await client.request<Contact>({
      method: 'GET',
      path: `/v1/contacts/${encodeURIComponent(input.email)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getByEmail
}
