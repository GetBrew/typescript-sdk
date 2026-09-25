import type { operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { AutomationsListResponse } from './types'

export type ListAutomationsResponse = AutomationsListResponse

/**
 * Query params accepted by `brew.automations.list(...)`: `search` (name
 * words, full-text, best match first instead of newest first) plus
 * `limit` / `cursor`. Sourced from the generated `listAutomations` query
 * so any new knob upstream surfaces as a compile error in the SDK.
 */
export type ListAutomationsInput = NonNullable<
  operations['listAutomations']['parameters']['query']
>

/**
 * `GET /v1/automations` (scope: `automations`) — every automation in the
 * brand, under the uniform `{ data, pagination }` envelope. List rows
 * are LEAN: no `nodes` / `connections`. Find one by name with `search`;
 * page with `limit` / `cursor`.
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
        search: input.search,
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listAutomations
}
