import type { PaginationInput } from '../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { AutomationsListResponse } from './types'

export type ListAutomationsResponse = AutomationsListResponse

/** Pagination knobs accepted by `brew.automations.list(...)`. */
export type ListAutomationsInput = PaginationInput

/**
 * `GET /v1/automations` (scope: `automations`) — every automation in the
 * brand, under the uniform `{ data, pagination }` envelope. List rows
 * are LEAN: no `nodes` / `connections`. Page with `limit` / `cursor`.
 *
 * A single automation is
 * `brew.automations.get(automationId, { include: 'graph' })` — there is
 * no `automationId` filter here any more.
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
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listAutomations
}
