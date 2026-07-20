import { unwrapResponse, type HttpClient } from '../../core/http'
import type { operations } from '../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../types'

/** Composable filters accepted by `GET /v1/analytics/overview`. */
export type AnalyticsOverviewInput = NonNullable<
  operations['getAnalyticsOverview']['parameters']['query']
>

/** Brand-wide totals, rates, and zero-filled timeseries for the window. */
export type AnalyticsOverviewResponse =
  operations['getAnalyticsOverview']['responses'][200]['content']['application/json']

/**
 * `GET /v1/analytics/overview` — the exact totals, rates, and timeseries read
 * behind Brew's analytics overview. Filters compose; wide raw-event windows
 * can return `truncated: true`, in which case narrow the requested range.
 */
export function createAnalyticsOverview(client: HttpClient) {
  function analyticsOverview(
    input: AnalyticsOverviewInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<AnalyticsOverviewResponse>>
  function analyticsOverview(
    input?: AnalyticsOverviewInput,
    options?: RequestOptions
  ): Promise<AnalyticsOverviewResponse>
  async function analyticsOverview(
    input: AnalyticsOverviewInput = {},
    options?: RequestOptions
  ): Promise<
    AnalyticsOverviewResponse | BrewRawResponse<AnalyticsOverviewResponse>
  > {
    const response = await client.request<AnalyticsOverviewResponse>({
      method: 'GET',
      path: '/v1/analytics/overview',
      query: {
        from: input.from,
        to: input.to,
        source: input.source,
        automationId: input.automationId,
        emailId: input.emailId,
        audienceId: input.audienceId,
        triggerEventId: input.triggerEventId,
        domain: input.domain,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return analyticsOverview
}
