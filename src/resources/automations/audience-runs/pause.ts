import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { AudienceRunActionResponse } from './types'

export type PauseAudienceRunResponse = AudienceRunActionResponse

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
