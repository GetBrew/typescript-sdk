import type { components } from '../../generated/openapi-types'
import type { PaginationInput } from '../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type ListAudiencesResponse =
  components['schemas']['AudiencesListResponse']

/** Pagination knobs accepted by `brew.audiences.list(...)`. */
export type ListAudiencesInput = PaginationInput

/**
 * `GET /v1/audiences` (scope: `audiences`) — every saved audience for
 * the brand, under the uniform `{ data, pagination }` envelope. Page
 * with `limit` / `cursor`.
 *
 * A single audience is
 * `brew.audiences.get(audienceId, { include: 'count' })` — there is no
 * `audienceId` filter here any more.
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
      query: {
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listAudiences
}
