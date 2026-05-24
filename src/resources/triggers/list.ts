import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { TriggersListResponse } from './types'

export type ListTriggersResponse = TriggersListResponse

/**
 * `GET /v1/triggers` — list every trigger in the API key brand,
 * including both API-created customs (`provider: 'brew_api'`) and
 * integration-provisioned rows (`provider: 'clerk' | 'stripe' | …`).
 * For a single trigger use `brew.triggers.get(...)` — it returns a
 * one-element list with the same wrapper shape.
 */
export function createListTriggers(client: HttpClient) {
  function listTriggers(
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListTriggersResponse>>
  function listTriggers(options?: RequestOptions): Promise<ListTriggersResponse>
  async function listTriggers(
    options?: RequestOptions
  ): Promise<ListTriggersResponse | BrewRawResponse<ListTriggersResponse>> {
    const response = await client.request<ListTriggersResponse>({
      method: 'GET',
      path: '/v1/triggers',
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
 * Single-row get returns the same `{ triggers: [...] }` envelope as
 * list mode — a one-element array (or `404
 * TRIGGER_EVENT_NOT_FOUND` when missing). Use `result.triggers[0]`
 * to destructure the row.
 */
export type GetTriggerResponse = TriggersListResponse

/**
 * `GET /v1/triggers?triggerEventId=…` — return a single-element
 * `{ triggers: [row] }` envelope.
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
      path: '/v1/triggers',
      query: { triggerEventId: input.triggerEventId },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getTrigger
}
