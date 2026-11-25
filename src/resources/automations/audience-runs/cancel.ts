import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { AudienceRunActionResponse } from './types'

export type CancelAudienceRunResponse = AudienceRunActionResponse

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
