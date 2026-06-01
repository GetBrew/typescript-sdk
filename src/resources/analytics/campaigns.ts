import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { CampaignAnalyticsResponse } from './types'

export type { CampaignAnalyticsResponse }

/**
 * `GET /v1/analytics/campaigns` — lifetime per-campaign performance
 * (sent / delivered / opened / clicked / bounced / complained /
 * unsubscribed) for every campaign that has actually sent. Read-only;
 * requires the `emails` scope.
 */
export function createCampaignAnalytics(client: HttpClient) {
  function campaignAnalytics(
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<CampaignAnalyticsResponse>>
  function campaignAnalytics(
    options?: RequestOptions
  ): Promise<CampaignAnalyticsResponse>
  async function campaignAnalytics(
    options?: RequestOptions
  ): Promise<
    CampaignAnalyticsResponse | BrewRawResponse<CampaignAnalyticsResponse>
  > {
    const response = await client.request<CampaignAnalyticsResponse>({
      method: 'GET',
      path: '/v1/analytics/campaigns',
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return campaignAnalytics
}
