import type { components } from '../../generated/openapi-types'
import type { PaginationInput } from '../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type ListAudiencesResponse =
  components['schemas']['AudiencesListResponse']

/** Input to `brew.audiences.list` — cursor pagination knobs. */
export type ListAudiencesInput = PaginationInput

/**
 * List saved audiences for the current organization. Returns
 * `{ audiences, pagination }`. Accepts `limit`/`cursor` for paging.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ListAudiencesResponse>` (including `status`,
 * `headers`, and `requestId`) instead of the unwrapped envelope.
 */
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
      query: { limit: input.limit, cursor: input.cursor },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listAudiences
}
