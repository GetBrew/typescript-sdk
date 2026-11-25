import type { PaginationInput } from '../../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { TriggersListResponse } from './types'

export type ListTriggersResponse = TriggersListResponse

export type ListTriggersInput = PaginationInput

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
