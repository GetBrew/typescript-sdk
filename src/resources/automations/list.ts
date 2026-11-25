import type { operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { AutomationsListResponse } from './types'

export type ListAutomationsResponse = AutomationsListResponse

export type ListAutomationsInput = NonNullable<
  operations['listAutomations']['parameters']['query']
>

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
