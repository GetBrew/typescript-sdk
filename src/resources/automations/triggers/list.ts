import type { PaginationInput } from '../../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { TriggersListResponse } from './types'

export type ListTriggersResponse = TriggersListResponse

/**
 * Input to `brew.automations.triggers.list(...)` — the single triggers
 * read. Reads are flat: identity lives in the query.
 *
 * - Omit `triggerEventId` to LIST every trigger in the brand.
 * - Pass `triggerEventId` to fetch ONE — the response is a single-row
 *   page `{ data: [row] }` (no `pagination`).
 */
export type ListTriggersInput = PaginationInput & {
  /** Fetch one trigger by id (detail mode → single-row page). Omit to list. */
  readonly triggerEventId?: string
}

/**
 * `GET /v1/automations/triggers` (scope: `automations`) — the single
 * triggers read, under the uniform `{ data, pagination? }` envelope.
 * Reads are flat: the identity lives in the query.
 *
 * - List mode (no `triggerEventId`): every trigger in the API key
 *   brand, including both API-created customs (`provider: 'brew_api'`)
 *   and integration-provisioned rows (`provider: 'clerk' | 'stripe' |
 *   …`). Page with `limit` / `cursor`.
 * - Detail mode (`triggerEventId` set): a single-row page
 *   `{ data: [row] }` with no `pagination`.
 *
 * Unknown / cross-brand ids return an empty page in detail mode.
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
        triggerEventId: input.triggerEventId,
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listTriggers
}
