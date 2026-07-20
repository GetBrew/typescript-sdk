import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { components } from '../../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { AudienceRunControlResponse } from './types'

export type ControlAudienceRunInput = {
  readonly audienceRunId: string
} & components['schemas']['AudienceRunControlRequest']
export type ControlAudienceRunResponse = AudienceRunControlResponse

/**
 * `POST /v1/automations/audience-runs/{audienceRunId}/control` — pause,
 * resume, or permanently cancel an in-flight manual-audience run.
 */
export function createControlAudienceRun(client: HttpClient) {
  function controlAudienceRun(
    input: ControlAudienceRunInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ControlAudienceRunResponse>>
  function controlAudienceRun(
    input: ControlAudienceRunInput,
    options?: RequestOptions
  ): Promise<ControlAudienceRunResponse>
  async function controlAudienceRun(
    input: ControlAudienceRunInput,
    options?: RequestOptions
  ): Promise<
    ControlAudienceRunResponse | BrewRawResponse<ControlAudienceRunResponse>
  > {
    const { audienceRunId, ...body } = input
    const response = await client.request<ControlAudienceRunResponse>({
      method: 'POST',
      path: `/v1/automations/audience-runs/${encodeURIComponent(audienceRunId)}/control`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return controlAudienceRun
}
