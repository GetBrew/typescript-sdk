import { unwrapResponse, type HttpClient } from '../../core/http'
import type { components } from '../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type RunAutomationInput = {
  readonly automationId: string
} & Omit<components['schemas']['AutomationRunRequest'], 'dry_run'>

export type RunAutomationDryRunResponse =
  components['schemas']['AutomationRunDryRunResponse']
export type RunAutomationStartedResponse =
  components['schemas']['AudienceAutomationRunStartedResponse']
export type RunAutomationResponse =
  | RunAutomationDryRunResponse
  | RunAutomationStartedResponse

export function createRunAutomation(client: HttpClient) {
  function runAutomation(
    input: RunAutomationInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<RunAutomationResponse>>
  function runAutomation(
    input: RunAutomationInput,
    options?: RequestOptions
  ): Promise<RunAutomationResponse>
  async function runAutomation(
    input: RunAutomationInput,
    options?: RequestOptions
  ): Promise<RunAutomationResponse | BrewRawResponse<RunAutomationResponse>> {
    const { automationId, ...body } = input
    const response = await client.request<RunAutomationResponse>({
      method: 'POST',
      path: `/v1/automations/${encodeURIComponent(automationId)}/run`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return runAutomation
}
