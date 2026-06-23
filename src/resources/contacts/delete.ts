import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type DeleteContactInput = {
  readonly email: string
}

/** `{ email, deleted }` — `deleted: false` when the email had no contact. */
export type DeleteContactResponse =
  components['schemas']['ContactDeleteResponse']

/**
 * `DELETE /v1/contacts/{email}` (scope: `contacts`) — delete a single
 * contact by email.
 *
 * Email now travels in the path (not the request body). Idempotent: an
 * unknown email resolves `200` with `{ deleted: false }` rather than a
 * `404`. For bulk deletion use `brew.contacts.deleteMany`
 * (`POST /v1/contacts/batch-delete`).
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<DeleteContactResponse>` instead of the unwrapped
 * payload.
 */
export function createDeleteContact(client: HttpClient) {
  function deleteContact(
    input: DeleteContactInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<DeleteContactResponse>>
  function deleteContact(
    input: DeleteContactInput,
    options?: RequestOptions
  ): Promise<DeleteContactResponse>
  async function deleteContact(
    input: DeleteContactInput,
    options?: RequestOptions
  ): Promise<DeleteContactResponse | BrewRawResponse<DeleteContactResponse>> {
    const response = await client.request<DeleteContactResponse>({
      method: 'DELETE',
      path: `/v1/contacts/${encodeURIComponent(input.email)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return deleteContact
}
