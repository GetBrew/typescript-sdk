import type { PaginationInput } from '../../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { Trigger, TriggersListResponse } from './types'

export type ListTriggersResponse = TriggersListResponse

/** Input to `brew.automations.triggers.list` — cursor pagination knobs. */
export type ListTriggersInput = PaginationInput

/**
 * `GET /v1/automations/triggers` — list every trigger in the API key
 * brand, including both API-created customs (`provider: 'brew_api'`) and
 * integration-provisioned rows (`provider: 'clerk' | 'stripe' | …`).
 * Returns the uniform `{ data, pagination }` envelope; accepts
 * `limit`/`cursor`. For a single trigger use
 * `brew.automations.triggers.get(...)`.
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
      query: { limit: input.limit, cursor: input.cursor },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listTriggers
}

export type GetTriggerInput = {
  triggerEventId: string
}

/**
 * Single-row get returns the bare `Trigger` row (or `404
 * TRIGGER_EVENT_NOT_FOUND` when missing).
 */
export type GetTriggerResponse = Trigger

/**
 * `GET /v1/automations/triggers/{triggerEventId}` — fetch a single
 * trigger by id, returning the bare row.
 */
export function createGetTrigger(client: HttpClient) {
  function getTrigger(
    input: GetTriggerInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetTriggerResponse>>
  function getTrigger(
    input: GetTriggerInput,
    options?: RequestOptions
  ): Promise<GetTriggerResponse>
  async function getTrigger(
    input: GetTriggerInput,
    options?: RequestOptions
  ): Promise<GetTriggerResponse | BrewRawResponse<GetTriggerResponse>> {
    const response = await client.request<GetTriggerResponse>({
      method: 'GET',
      path: `/v1/automations/triggers/${encodeURIComponent(input.triggerEventId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getTrigger
}
