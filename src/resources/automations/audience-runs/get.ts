import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { AudienceRun } from './types'

export type GetAudienceRunResponse = AudienceRun

export function createGetAudienceRun(client: HttpClient) {
  function getAudienceRun(
    audienceRunId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetAudienceRunResponse>>
  function getAudienceRun(
    audienceRunId: string,
    options?: RequestOptions
  ): Promise<GetAudienceRunResponse>
  async function getAudienceRun(
    audienceRunId: string,
    options?: RequestOptions
  ): Promise<GetAudienceRunResponse | BrewRawResponse<GetAudienceRunResponse>> {
    const response = await client.request<GetAudienceRunResponse>({
      method: 'GET',
      path: `/v1/automations/audience-runs/${encodeURIComponent(audienceRunId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getAudienceRun
}
