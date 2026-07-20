import { unwrapResponse, type HttpClient } from '../../core/http'
import type { components } from '../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../types'

/** Path identity plus the optional manual-audience run configuration. */
export type RunAutomationInput = {
  readonly automationId: string
} & components['schemas']['AutomationRunRequest']

export type RunAutomationDryRunResponse =
  components['schemas']['AutomationRunDryRunResponse']
export type RunAutomationStartedResponse =
  components['schemas']['AudienceAutomationRunStartedResponse']
export type RunAutomationResponse =
  | RunAutomationDryRunResponse
  | RunAutomationStartedResponse

/**
 * `POST /v1/automations/{automationId}/run` — preview, launch, or schedule a
 * manual-audience automation. Supply `options.idempotencyKey` for safe
 * retries; POST requests also receive an automatically generated key.
 */
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
