import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { AudienceRunActionResponse } from './types'

export type ResumeAudienceRunResponse = AudienceRunActionResponse

export function createResumeAudienceRun(client: HttpClient) {
  function resumeAudienceRun(
    audienceRunId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ResumeAudienceRunResponse>>
  function resumeAudienceRun(
    audienceRunId: string,
    options?: RequestOptions
  ): Promise<ResumeAudienceRunResponse>
  async function resumeAudienceRun(
    audienceRunId: string,
    options?: RequestOptions
  ): Promise<
    ResumeAudienceRunResponse | BrewRawResponse<ResumeAudienceRunResponse>
  > {
    const response = await client.request<ResumeAudienceRunResponse>({
      method: 'POST',
      path: `/v1/automations/audience-runs/${encodeURIComponent(audienceRunId)}/resume`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return resumeAudienceRun
}
