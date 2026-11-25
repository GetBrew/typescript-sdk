import { unwrapResponse, type HttpClient } from '../../core/http'
import { serializeInclude } from '../../core/url'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { InsightsListResponse, ListInsightsQuery } from './types'

export const INSIGHTS_INCLUDE_TOKENS = [
  'pulse',
  'report',
  'suggestions',
  'memo',
] as const
export type InsightsIncludeToken = (typeof INSIGHTS_INCLUDE_TOKENS)[number]

export type ListInsightsInput = Readonly<
  Omit<ListInsightsQuery, 'include'> & {
    readonly include?: ReadonlyArray<InsightsIncludeToken> | string
  }
>

export type ListInsightsResponse = InsightsListResponse

export function createListInsights(client: HttpClient) {
  function listInsights(
    input: ListInsightsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListInsightsResponse>>
  function listInsights(
    input?: ListInsightsInput,
    options?: RequestOptions
  ): Promise<ListInsightsResponse>
  async function listInsights(
    input: ListInsightsInput = {},
    options?: RequestOptions
  ): Promise<ListInsightsResponse | BrewRawResponse<ListInsightsResponse>> {
    const response = await client.request<ListInsightsResponse>({
      method: 'GET',
      path: '/v1/insights',
      query: {
        state: input.state,
        severity: input.severity,
        include: serializeInclude({ include: input.include }),
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listInsights
}
