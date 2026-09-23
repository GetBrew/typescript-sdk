import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { AudienceRunActionResponse } from './types'

/**
 * 200 result of a resume — `{ audienceRunId, status: 'running' }`, plus
 * `resumedFrom` naming the state it came back from (`paused` | `failed`).
 */
export type ResumeAudienceRunResponse = AudienceRunActionResponse

/**
 * `POST /v1/automations/audience-runs/{audienceRunId}/resume` (scope:
 * `automations`) — pick a paused (or failed) manual-audience run back up
 * where it left off. The response's `resumedFrom` says which state it
 * came back from.
 *
 * This is one of the three action sub-paths that replaced the old
 * `control({ action })` body verb.
 *
 * A run that is not resumable surfaces as `409 RUN_NOT_RESUMABLE`; an
 * exhausted send quota is `402 SEND_QUOTA_EXCEEDED`; an unknown or
 * cross-brand id is `404 AUDIENCE_RUN_NOT_FOUND`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ResumeAudienceRunResponse>` instead of the unwrapped
 * payload.
 */
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
