import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { AudienceRunActionResponse } from './types'

/** 200 result of a cancel — `{ audienceRunId, status: 'canceled' }`. */
export type CancelAudienceRunResponse = AudienceRunActionResponse

/**
 * `POST /v1/automations/audience-runs/{audienceRunId}/cancel` (scope:
 * `automations`) — permanently end an in-flight manual-audience run.
 * Nothing further is sent, and a canceled run cannot be resumed; mail
 * already delivered is NOT recalled. Reach for `pause` instead when you
 * want the reversible stop.
 *
 * This is one of the three action sub-paths that replaced the old
 * `control({ action })` body verb.
 *
 * A run that already finished surfaces as `409 RUN_NOT_CANCELLABLE`; an
 * unknown or cross-brand id is `404 AUDIENCE_RUN_NOT_FOUND`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<CancelAudienceRunResponse>` instead of the unwrapped
 * payload.
 */
export function createCancelAudienceRun(client: HttpClient) {
  function cancelAudienceRun(
    audienceRunId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<CancelAudienceRunResponse>>
  function cancelAudienceRun(
    audienceRunId: string,
    options?: RequestOptions
  ): Promise<CancelAudienceRunResponse>
  async function cancelAudienceRun(
    audienceRunId: string,
    options?: RequestOptions
  ): Promise<
    CancelAudienceRunResponse | BrewRawResponse<CancelAudienceRunResponse>
  > {
    const response = await client.request<CancelAudienceRunResponse>({
      method: 'POST',
      path: `/v1/automations/audience-runs/${encodeURIComponent(audienceRunId)}/cancel`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return cancelAudienceRun
}
