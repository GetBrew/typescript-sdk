import type { components } from '../../generated/openapi-types'
import type { PaginationInput } from '../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type ListAudiencesResponse =
  components['schemas']['AudiencesListResponse']

/**
 * Input to `brew.audiences.list(...)` — the single audiences read. Reads
 * are flat: identity lives in the query.
 *
 * - Omit `audienceId` to LIST every saved audience.
 * - Pass `audienceId` to fetch ONE — the response is a single-row page
 *   `{ data: [row] }` (no `pagination`).
 * - `include: 'count'` is a detail-only opt-in (requires `audienceId`):
 *   it makes the row's `count` the authoritative, freshly computed live
 *   member total instead of the cached value. Accepts a single token, an
 *   array, or a comma string.
 */
export type AudiencesIncludeToken = 'count'

export type ListAudiencesInput = PaginationInput & {
  /** Fetch one audience by id (detail mode → single-row page). Omit to list. */
  readonly audienceId?: string
  /**
   * Detail-only expansion (requires `audienceId`). `'count'` makes the
   * row's `count` the authoritative live member total — the size a
   * campaign send would target — instead of the cached value. Accepts an
   * array of `'count'` tokens or a comma string.
   */
  readonly include?: ReadonlyArray<AudiencesIncludeToken> | string
}

/** Serialize the `include` option into the API's comma-separated form. */
function serializeInclude(
  include: ListAudiencesInput['include']
): string | undefined {
  if (include === undefined) return undefined
  const joined = typeof include === 'string' ? include : include.join(',')
  return joined.length > 0 ? joined : undefined
}

/**
 * `GET /v1/audiences` (scope: `audiences`) — the single audiences read,
 * under the uniform `{ data, pagination? }` envelope. Reads are flat:
 * the identity lives in the query.
 *
 * - List mode (no `audienceId`): every saved audience for the brand;
 *   page with `limit` / `cursor`.
 * - Detail mode (`audienceId` set): a single-row page `{ data: [row] }`
 *   with no `pagination`. Pass `include: 'count'` to make `count` the
 *   authoritative live member total (an `include` without `audienceId`
 *   is `400 INVALID_REQUEST`).
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
        audienceId: input.audienceId,
        include: serializeInclude(input.include),
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listAudiences
}
