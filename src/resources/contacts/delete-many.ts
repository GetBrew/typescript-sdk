import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type DeleteManyContactsInput = {
  readonly emails: ReadonlyArray<string>
}

/** `{ deleted, notFound }` — the deleted count plus emails that had no contact. */
export type DeleteManyContactsResponse =
  components['schemas']['ContactsBatchDeleteResponse']

/**
 * `POST /v1/contacts/batch-delete` (scope: `contacts`) — delete up to
 * 1000 contacts by email in one request.
 *
 * Batch delete moved to its own endpoint with a `{ emails: [...] }` body
 * (single delete now lives at `DELETE /v1/contacts/{email}`). Returns the
 * deleted count plus a `notFound[]` array for emails that had no contact.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<DeleteManyContactsResponse>` instead of the unwrapped
 * payload.
 */
export function createDeleteManyContacts(client: HttpClient) {
  function deleteMany(
    input: DeleteManyContactsInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<DeleteManyContactsResponse>>
  function deleteMany(
    input: DeleteManyContactsInput,
    options?: RequestOptions
  ): Promise<DeleteManyContactsResponse>
  async function deleteMany(
    input: DeleteManyContactsInput,
    options?: RequestOptions
  ): Promise<
    DeleteManyContactsResponse | BrewRawResponse<DeleteManyContactsResponse>
  > {
    const response = await client.request<DeleteManyContactsResponse>({
      method: 'POST',
      path: '/v1/contacts/batch-delete',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return deleteMany
}
