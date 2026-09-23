import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { AudienceRunActionResponse } from './types'

/** 200 result of a pause — `{ audienceRunId, status: 'paused' }`. */
export type PauseAudienceRunResponse = AudienceRunActionResponse

/**
 * `POST /v1/automations/audience-runs/{audienceRunId}/pause` (scope:
 * `automations`) — halt an in-flight manual-audience run without
 * discarding it. Contacts already mailed stay mailed; the remaining
 * recipients simply stop entering the graph until you `resume`.
 *
 * This is one of the three action sub-paths that replaced the old
 * `control({ action })` body verb.
 *
 * A run that is not in a pausable state surfaces as
 * `409 RUN_NOT_PAUSABLE`; an unknown or cross-brand id is
 * `404 AUDIENCE_RUN_NOT_FOUND`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<PauseAudienceRunResponse>` instead of the unwrapped
 * payload.
 */
export function createPauseAudienceRun(client: HttpClient) {
  function pauseAudienceRun(
    audienceRunId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<PauseAudienceRunResponse>>
  function pauseAudienceRun(
    audienceRunId: string,
    options?: RequestOptions
  ): Promise<PauseAudienceRunResponse>
  async function pauseAudienceRun(
    audienceRunId: string,
    options?: RequestOptions
  ): Promise<
    PauseAudienceRunResponse | BrewRawResponse<PauseAudienceRunResponse>
  > {
    const response = await client.request<PauseAudienceRunResponse>({
      method: 'POST',
      path: `/v1/automations/audience-runs/${encodeURIComponent(audienceRunId)}/pause`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return pauseAudienceRun
}
