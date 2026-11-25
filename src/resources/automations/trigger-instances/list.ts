import { autoPaginate, pageReadOptions } from '../../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type {
  ListTriggerInstancesInput,
  TriggerInstance,
  TriggerInstancesListResponse,
} from './types'

export type { ListTriggerInstancesInput, TriggerInstancesListResponse }

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

export type ListAllTriggerInstancesInput = Readonly<
  Omit<ListTriggerInstancesInput, 'cursor'>
>

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
        const response = await list(pageInput, pageReadOptions({ options }))
        return { items: response.data, pagination: response.pagination }
      },
      options?.signal ? { signal: options.signal } : undefined
    )
  }
}
