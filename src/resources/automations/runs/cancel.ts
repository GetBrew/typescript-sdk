import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { components } from '../../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { AutomationRunCancelResponse } from './types'

type AutomationRunCancelRequest =
  components['schemas']['AutomationRunCancelRequest']

/**
 * Input to `brew.automations.runs.cancel(...)`. `status` is the only PATCH
 * action the API has today and is always `'canceled'`, so the method fills
 * it in — pass just the run id and an optional operator note.
 */
export type CancelAutomationRunInput = Omit<
  AutomationRunCancelRequest,
  'status'
> & {
  readonly status?: AutomationRunCancelRequest['status']
}
export type CancelAutomationRunResponse = AutomationRunCancelResponse

/**
 * `PATCH /v1/automations/runs` — operator cancel of ONE run (an event
 * execution or a test run) by `automationRunId`, the same flat identity the
 * read uses. Marks the run `canceled` (first-terminal-wins), wakes a run
 * parked on a wait node so it observes the cancel now, and terminates the
 * durable workflow run. Nothing further is sent; emails already delivered
 * are NOT recalled and a canceled run cannot be resumed.
 *
 * `409 RUN_NOT_CANCELLABLE` once the run already finished; `404
 * AUTOMATION_RUN_NOT_FOUND` for an unknown / cross-brand id. Manual-audience
 * launches are controlled with `audienceRuns.control(...)` instead.
 */
export function createCancelAutomationRun(client: HttpClient) {
  function cancelAutomationRun(
    input: CancelAutomationRunInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<CancelAutomationRunResponse>>
  function cancelAutomationRun(
    input: CancelAutomationRunInput,
    options?: RequestOptions
  ): Promise<CancelAutomationRunResponse>
  async function cancelAutomationRun(
    input: CancelAutomationRunInput,
    options?: RequestOptions
  ): Promise<
    CancelAutomationRunResponse | BrewRawResponse<CancelAutomationRunResponse>
  > {
    const body: AutomationRunCancelRequest = {
      ...input,
      status: 'canceled',
    }
    const response = await client.request<CancelAutomationRunResponse>({
      method: 'PATCH',
      path: '/v1/automations/runs',
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return cancelAutomationRun
}
