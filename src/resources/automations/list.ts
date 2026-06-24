import type { PaginationInput } from '../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { AutomationsListResponse } from './types'

export type ListAutomationsResponse = AutomationsListResponse

/**
 * Input to `brew.automations.list(...)` — the single automations read.
 * Reads are flat: identity lives in the query.
 *
 * - Omit `automationId` to LIST the latest automation row in the brand.
 *   List rows are LEAN by default (no graph).
 * - Pass `automationId` to fetch ONE — the response is a single-row page
 *   `{ data: [row] }` (no `pagination`).
 * - `include` is a detail-only opt-in expansion (requires
 *   `automationId`): `'graph'` attaches `nodes` + `connections`;
 *   `'versions'` attaches the inline version history. Pass either token,
 *   an array, or a comma string.
 */
export type AutomationsIncludeToken = 'graph' | 'versions'

export type ListAutomationsInput = PaginationInput & {
  /** Fetch one automation by id (detail mode → single-row page). Omit to list. */
  readonly automationId?: string
  /**
   * Detail-only expansions (requires `automationId`). `'graph'` attaches
   * `nodes` + `connections`; `'versions'` attaches the inline version
   * history. Accepts an array of `'graph' | 'versions'` tokens or a comma
   * string.
   */
  readonly include?: ReadonlyArray<AutomationsIncludeToken> | string
}

/** Serialize the `include` option into the API's comma-separated form. */
function serializeInclude(
  include: ListAutomationsInput['include']
): string | undefined {
  if (include === undefined) return undefined
  const joined = typeof include === 'string' ? include : include.join(',')
  return joined.length > 0 ? joined : undefined
}

/**
 * `GET /v1/automations` (scope: `automations`) — the single automations
 * read, under the uniform `{ data, pagination? }` envelope. Reads are
 * flat: the identity lives in the query.
 *
 * - List mode (no `automationId`): the latest automation row in the
 *   brand, LEAN by default (no `nodes`/`connections`). Page with
 *   `limit` / `cursor`.
 * - Detail mode (`automationId` set): a single-row page `{ data: [row] }`
 *   with no `pagination`. Pass `include: 'graph'` to attach the graph
 *   and/or `include: 'versions'` for the version history — both
 *   detail-only (an `include` without `automationId` is
 *   `400 INVALID_REQUEST`). Pin a historical `automationVersionId` on
 *   publish to promote that exact graph.
 *
 * Unknown / cross-brand ids return an empty page in detail mode.
 */
export function createListAutomations(client: HttpClient) {
  function listAutomations(
    input: ListAutomationsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListAutomationsResponse>>
  function listAutomations(
    input?: ListAutomationsInput,
    options?: RequestOptions
  ): Promise<ListAutomationsResponse>
  async function listAutomations(
    input: ListAutomationsInput = {},
    options?: RequestOptions
  ): Promise<
    ListAutomationsResponse | BrewRawResponse<ListAutomationsResponse>
  > {
    const response = await client.request<ListAutomationsResponse>({
      method: 'GET',
      path: '/v1/automations',
      query: {
        automationId: input.automationId,
        include: serializeInclude(input.include),
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listAutomations
}
