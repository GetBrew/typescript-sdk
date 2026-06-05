import type { PaginationInput } from '../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { CampaignAnalyticsResponse } from './types'

export type { CampaignAnalyticsResponse }

/** Input to `brew.analytics.campaigns` — cursor pagination knobs. */
export type CampaignAnalyticsInput = PaginationInput

/**
 * `GET /v1/analytics/campaigns` — lifetime per-campaign performance
 * (sent / delivered / opened / clicked / bounced / complained /
 * unsubscribed) for every campaign that has actually sent. Returns
 * `{ campaigns, pagination }`; accepts `limit`/`cursor`. Read-only;
 * requires the `emails` scope.
 */
export function createCampaignAnalytics(client: HttpClient) {
  function campaignAnalytics(
    input: CampaignAnalyticsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<CampaignAnalyticsResponse>>
  function campaignAnalytics(
    input?: CampaignAnalyticsInput,
    options?: RequestOptions
  ): Promise<CampaignAnalyticsResponse>
  async function campaignAnalytics(
    input: CampaignAnalyticsInput = {},
    options?: RequestOptions
  ): Promise<
    CampaignAnalyticsResponse | BrewRawResponse<CampaignAnalyticsResponse>
  > {
    const response = await client.request<CampaignAnalyticsResponse>({
      method: 'GET',
      path: '/v1/analytics/campaigns',
      query: { limit: input.limit, cursor: input.cursor },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return campaignAnalytics
}
