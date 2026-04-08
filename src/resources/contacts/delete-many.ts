import type { HttpClient } from '../../core/http'
import type { RequestOptions } from '../../types'

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
 */
export function createDeleteManyContacts(client: HttpClient) {
  return async (
    input: DeleteManyContactsInput,
    options?: RequestOptions
  ): Promise<DeleteContactsResponse> => {
    const response = await client.request<DeleteContactsResponse>({
      method: 'DELETE',
      path: '/v1/contacts',
      body: input,
      ...(options ? { options } : {}),
    })
    return response.data
  }
}
