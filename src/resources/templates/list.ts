import type { components, operations } from '../../generated/openapi-types'
import type { HttpClient } from '../../core/http'

export type ListTemplatesInput =
  operations['listTemplates']['parameters']['query']
export type ListTemplatesResponse =
  components['schemas']['TemplatesListResponse']

/**
 * List public templates.
 *
 * Filters map directly to the public API query params.
 */
export function createListTemplates(client: HttpClient) {
  return async (
    input: ListTemplatesInput = {}
  ): Promise<ListTemplatesResponse> => {
    const response = await client.request<ListTemplatesResponse>({
      method: 'GET',
      path: '/v1/templates',
      query: input,
    })
    return response.data
  }
}
