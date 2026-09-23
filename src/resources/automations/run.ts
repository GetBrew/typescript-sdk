import { unwrapResponse, type HttpClient } from '../../core/http'
import type { components } from '../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../types'

/**
 * Path identity plus the optional manual-audience run configuration.
 *
 * The preview flag is `dryRun`. The legacy `dry_run` spelling is gone
 * from the wire, and the `Omit` here keeps it off the SDK surface even
 * if a stale generated mirror still advertises it.
 */
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

/**
 * `POST /v1/automations/{automationId}/run` — preview, launch, or schedule a
 * manual-audience automation. `dryRun: true` returns recipient and
 * send-node counts without starting anything. Supply
 * `options.idempotencyKey` for safe retries; POST requests also receive
 * an automatically generated key.
 *
 * A started run is controlled through
 * `brew.automations.audienceRuns.pause / .resume / .cancel`.
 *
 * A missing entity is named precisely: `404 AUTOMATION_NOT_FOUND` when
 * the automation is unknown, `404 AUDIENCE_NOT_FOUND` when its audience
 * is. Neither is the generic `NOT_FOUND` any more, so error mapping can
 * branch on which one is missing.
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
