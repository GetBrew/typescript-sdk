import { unwrapResponse, type HttpClient } from '../../core/http'
import type { operations } from '../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { FlowsListResponse } from './types'

type ListFlowsQuery = NonNullable<
  operations['listFlows']['parameters']['query']
>

export type ListFlowsInput = ListFlowsQuery

export type ListFlowsResponse = FlowsListResponse

export type { FlowsListResponse }

export function createListFlows(client: HttpClient) {
  function listFlows(
    input: ListFlowsInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListFlowsResponse>>
  function listFlows(
    input?: ListFlowsInput,
    options?: RequestOptions
  ): Promise<ListFlowsResponse>
  async function listFlows(
    input: ListFlowsInput = {},
    options?: RequestOptions
  ): Promise<ListFlowsResponse | BrewRawResponse<ListFlowsResponse>> {
    const query: Record<string, string> = {}
    for (const [key, value] of Object.entries(input)) {
      if (value === undefined) continue
      if (typeof value === 'string') {
        query[key] = value
      } else if (typeof value === 'number') {
        query[key] = String(value)
      }
    }
    const response = await client.request<ListFlowsResponse>({
      method: 'GET',
      path: '/v1/flows',
      query,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listFlows
}
