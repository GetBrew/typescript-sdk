import type { components } from '../../generated/openapi-types'
import type { HttpClient } from '../../core/http'

export type ListFieldsResponse = components['schemas']['FieldsGetResponse']

/**
 * List every contact field definition (both core fields and
 * organization-specific custom fields).
 *
 * Returns the full envelope (not just the array) so the API can grow
 * metadata like pagination or field counts later without a breaking
 * change on consumers. For now the envelope is just `{ fields }`.
 */
export function createListFields(client: HttpClient) {
  return async (): Promise<ListFieldsResponse> => {
    const response = await client.request<ListFieldsResponse>({
      method: 'GET',
      path: '/v1/fields',
    })
    return response.data
  }
}
