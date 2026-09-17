import { autoPaginate } from '../../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type {
  ListTriggerInstancesInput,
  TriggerInstance,
  TriggerInstancesListResponse,
} from './types'

export type { ListTriggerInstancesInput, TriggerInstancesListResponse }

/**
 * `GET /v1/automations/trigger-instances` (scope: `automations`) — the
 * audit log of every inbound fire (API `source: 'api'` or integration
 * `source: 'integration'`), newest first, under the uniform
 * `{ data, pagination }` envelope. Each row links the fire to the
 * automations it matched (`matchedAutomationIds`) and the runs it
 * started (`automationRunIds`).
 *
 * Filter with `triggerEventId`; page with `limit` / `cursor`. A single
 * instance is `brew.automations.triggerInstances.get(triggerInstanceId)`
 * — there is no `triggerInstanceId` filter here any more.
 *
 * This read moved off `analytics` in v1: it is trigger history, not a
 * report. To page through every instance use
 * `brew.automations.triggerInstances.listAll`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<TriggerInstancesListResponse>` instead of the
 * unwrapped envelope.
 */
export function createListTriggerInstances(client: HttpClient) {
  function listTriggerInstances(
    input: ListTriggerInstancesInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<TriggerInstancesListResponse>>
  function listTriggerInstances(
    input?: ListTriggerInstancesInput,
    options?: RequestOptions
  ): Promise<TriggerInstancesListResponse>
  async function listTriggerInstances(
    input: ListTriggerInstancesInput = {},
    options?: RequestOptions
  ): Promise<
    TriggerInstancesListResponse | BrewRawResponse<TriggerInstancesListResponse>
  > {
    const response = await client.request<TriggerInstancesListResponse>({
      method: 'GET',
      path: '/v1/automations/trigger-instances',
      query: {
        triggerEventId: input.triggerEventId,
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listTriggerInstances
}

/**
 * Input to `brew.automations.triggerInstances.listAll(...)`. Same
 * filters as `list` minus `cursor` — the iterator owns cursor state.
 */
export type ListAllTriggerInstancesInput = Readonly<
  Omit<ListTriggerInstancesInput, 'cursor'>
>

/**
 * Async iterator that pages through every matching trigger instance,
 * yielding one row at a time. Follows `pagination.cursor` until
 * `hasMore` is `false`; honors `options.signal` between pages.
 */
export function createListAllTriggerInstances(client: HttpClient) {
  const list = createListTriggerInstances(client)

  return function listAllTriggerInstances(
    input: ListAllTriggerInstancesInput = {},
    options?: RequestOptions
  ): AsyncGenerator<TriggerInstance, void, void> {
    return autoPaginate<TriggerInstance>(
      async (cursor) => {
        const pageInput: ListTriggerInstancesInput = {
          ...input,
          ...(cursor !== null ? { cursor } : {}),
        }
        const response = await list(pageInput, options)
        return { items: response.data, pagination: response.pagination }
      },
      options?.signal ? { signal: options.signal } : undefined
    )
  }
}
