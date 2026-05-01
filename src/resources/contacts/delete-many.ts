import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { DeleteContactsResponse } from './delete'

export type DeleteManyContactsInput = {
  readonly emails: ReadonlyArray<string>
}

/**
 * Batch delete multiple contacts by email.
 *
 * Reuses `DeleteContactsResponse` from the single-delete module so the
 * two methods stay in sync — any change to the deletion response shape
 * ripples through both sites automatically.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<DeleteContactsResponse>` instead of the unwrapped
 * payload.
 */
export function createDeleteManyContacts(client: HttpClient) {
  function deleteMany(
    input: DeleteManyContactsInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<DeleteContactsResponse>>
  function deleteMany(
    input: DeleteManyContactsInput,
    options?: RequestOptions
  ): Promise<DeleteContactsResponse>
  async function deleteMany(
    input: DeleteManyContactsInput,
    options?: RequestOptions
  ): Promise<DeleteContactsResponse | BrewRawResponse<DeleteContactsResponse>> {
    const response = await client.request<DeleteContactsResponse>({
      method: 'DELETE',
      path: '/v1/contacts',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return deleteMany
}
