import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type DeleteContactInput = {
  readonly email: string
}

export type DeleteContactsResponse =
  components['schemas']['ContactsDeleteResponse']

/**
 * Delete a single contact by email.
 *
 * The wire format carries the email in the request body (not the URL)
 * because the raw API multiplexes single- and batch-delete on the same
 * endpoint via body shape. The SDK keeps single vs. batch as two
 * explicit methods so call sites stay self-documenting.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<DeleteContactsResponse>` instead of the unwrapped
 * payload.
 */
export function createDeleteContact(client: HttpClient) {
  function deleteContact(
    input: DeleteContactInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<DeleteContactsResponse>>
  function deleteContact(
    input: DeleteContactInput,
    options?: RequestOptions
  ): Promise<DeleteContactsResponse>
  async function deleteContact(
    input: DeleteContactInput,
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
  return deleteContact
}
