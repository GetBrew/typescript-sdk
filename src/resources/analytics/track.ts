import type { HttpClient } from '../../core/http'
import { unwrapResponse } from '../../core/http'
import type { components } from '../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type ProductAnalyticsEvent =
  components['schemas']['ProductAnalyticsEvent']
export type TrackProductAnalyticsInput =
  components['schemas']['ProductAnalyticsTrackRequest']
export type TrackProductAnalyticsResponse =
  components['schemas']['ProductAnalyticsTrackResponse']

/** Submit trusted server events. Preserve each event ID when retrying upstream jobs. */
export function createTrackProductAnalytics(client: HttpClient) {
  function track(
    input: TrackProductAnalyticsInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<TrackProductAnalyticsResponse>>
  function track(
    input: TrackProductAnalyticsInput,
    options?: RequestOptions
  ): Promise<TrackProductAnalyticsResponse>
  async function track(
    input: TrackProductAnalyticsInput,
    options?: RequestOptions
  ): Promise<
    | TrackProductAnalyticsResponse
    | BrewRawResponse<TrackProductAnalyticsResponse>
  > {
    const response = await client.request<TrackProductAnalyticsResponse>({
      method: 'POST',
      path: '/v1/analytics/track',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return track
}
