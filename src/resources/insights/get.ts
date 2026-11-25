import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Insight } from './types'

export type GetInsightResponse = Insight

export function createGetInsight(client: HttpClient) {
  function getInsight(
    insightId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetInsightResponse>>
  function getInsight(
    insightId: string,
    options?: RequestOptions
  ): Promise<GetInsightResponse>
  async function getInsight(
    insightId: string,
    options?: RequestOptions
  ): Promise<GetInsightResponse | BrewRawResponse<GetInsightResponse>> {
    const response = await client.request<GetInsightResponse>({
      method: 'GET',
      path: `/v1/insights/${encodeURIComponent(insightId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getInsight
}
