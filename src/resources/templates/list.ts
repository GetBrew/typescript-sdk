import type { components, operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type ListTemplatesInput =
  operations['listTemplates']['parameters']['query']
export type ListTemplatesResponse =
  components['schemas']['TemplatesListResponse']

/**
 * List public templates.
 *
 * Filters map directly to the public API query params.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ListTemplatesResponse>` instead of the unwrapped
 * envelope.
 */
export function createListTemplates(client: HttpClient) {
  function listTemplates(
    input: ListTemplatesInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListTemplatesResponse>>
  function listTemplates(
    input?: ListTemplatesInput,
    options?: RequestOptions
  ): Promise<ListTemplatesResponse>
  async function listTemplates(
    input: ListTemplatesInput = {},
    options?: RequestOptions
  ): Promise<ListTemplatesResponse | BrewRawResponse<ListTemplatesResponse>> {
    const response = await client.request<ListTemplatesResponse>({
      method: 'GET',
      path: '/v1/templates',
      query: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listTemplates
}
