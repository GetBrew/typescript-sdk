import type { components, operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type ListAudiencesResponse =
  components['schemas']['AudiencesListResponse']

/**
 * Query params accepted by `brew.audiences.list(...)`: `search` (name
 * contains, case-insensitive) plus `limit` / `cursor`. Sourced from the
 * generated `listAudiences` query so any new knob upstream surfaces as a
 * compile error in the SDK.
 */
export type ListAudiencesInput = NonNullable<
  operations['listAudiences']['parameters']['query']
>

/**
 * `GET /v1/audiences` (scope: `audiences`) — every saved audience for
 * the brand, under the uniform `{ data, pagination }` envelope. Find
 * one by name with `search`; page with `limit` / `cursor`.
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
