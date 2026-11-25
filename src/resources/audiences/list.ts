import type { components, operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type ListAudiencesResponse =
  components['schemas']['AudiencesListResponse']

export type ListAudiencesInput = NonNullable<
  operations['listAudiences']['parameters']['query']
>

export function createListAudiences(client: HttpClient) {
  function listAudiences(
    input: ListAudiencesInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListAudiencesResponse>>
  function listAudiences(
    input?: ListAudiencesInput,
    options?: RequestOptions
  ): Promise<ListAudiencesResponse>
  async function listAudiences(
    input: ListAudiencesInput = {},
    options?: RequestOptions
  ): Promise<ListAudiencesResponse | BrewRawResponse<ListAudiencesResponse>> {
    const response = await client.request<ListAudiencesResponse>({
      method: 'GET',
      path: '/v1/audiences',
      query: {
        search: input.search,
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listAudiences
}
