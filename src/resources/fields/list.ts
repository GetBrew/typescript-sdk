import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type ListFieldsResponse = components['schemas']['FieldsGetResponse']

/**
 * List every contact field definition (both core fields and
 * organization-specific custom fields).
 *
 * Returns the full envelope (not just the array) so the API can grow
 * metadata like pagination or field counts later without a breaking
 * change on consumers. For now the envelope is just `{ fields }`.
 *
 * Pass `{ raw: true }` in the second argument to receive the full
 * `BrewRawResponse<ListFieldsResponse>` instead of the unwrapped
 * envelope.
 */
export function createListFields(client: HttpClient) {
  function listFields(
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListFieldsResponse>>
  function listFields(options?: RequestOptions): Promise<ListFieldsResponse>
  async function listFields(
    options?: RequestOptions
  ): Promise<ListFieldsResponse | BrewRawResponse<ListFieldsResponse>> {
    const response = await client.request<ListFieldsResponse>({
      method: 'GET',
      path: '/v1/fields',
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listFields
}
