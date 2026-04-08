import type { HttpClient } from '../../core/http'
import type { RequestOptions } from '../../types'

export type DeleteContactInput = {
  readonly email: string
}

export type DeleteContactsResponse = {
  readonly deleted: number
}

/**
 * Delete a single contact by email.
 *
 * The wire format carries the email in the request body (not the URL)
 * because the raw API multiplexes single- and batch-delete on the same
 * endpoint via body shape. The SDK keeps single vs. batch as two explicit
 * methods so call sites stay self-documenting.
 */
export function createDeleteContact(client: HttpClient) {
  return async (
    input: DeleteContactInput,
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
