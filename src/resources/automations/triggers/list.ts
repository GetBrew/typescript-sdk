import type { PaginationInput } from '../../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { TriggersListResponse } from './types'

export type ListTriggersResponse = TriggersListResponse

/** Pagination knobs accepted by `brew.automations.triggers.list(...)`. */
export type ListTriggersInput = PaginationInput

/**
 * `GET /v1/automations/triggers` (scope: `automations`) — every trigger
 * in the API key's brand, under the uniform `{ data, pagination }`
 * envelope. Includes both API-created customs (`provider: 'brew_api'`)
 * and integration-provisioned rows (`provider: 'clerk' | 'stripe' | …`).
 * Page with `limit` / `cursor`.
 *
 * A single trigger is
 * `brew.automations.triggers.get(triggerEventId)` — there is no
 * `triggerEventId` filter here any more.
 */
export function createListTriggers(client: HttpClient) {
  function listTriggers(
    input: ListTriggersInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListTriggersResponse>>
  function listTriggers(
    input?: ListTriggersInput,
    options?: RequestOptions
  ): Promise<ListTriggersResponse>
  async function listTriggers(
    input: ListTriggersInput = {},
    options?: RequestOptions
  ): Promise<ListTriggersResponse | BrewRawResponse<ListTriggersResponse>> {
    const response = await client.request<ListTriggersResponse>({
      method: 'GET',
      path: '/v1/automations/triggers',
      query: {
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listTriggers
}
