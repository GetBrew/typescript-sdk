import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { AutomationRunCancelResponse } from './types'

/**
 * Per-request options for `brew.automations.runs.cancel(...)` — the
 * standard `RequestOptions` plus the optional operator note recorded on
 * the run.
 */
export type CancelAutomationRunOptions = RequestOptions & {
  /** Free-text note recorded with the cancellation. */
  readonly reason?: string
}

export type CancelAutomationRunResponse = AutomationRunCancelResponse

/**
 * `POST /v1/automations/runs/{automationRunId}/cancel` (scope:
 * `automations`) — operator cancel of ONE run (an event execution or a
 * test run). Marks the run `canceled` (first-terminal-wins), wakes a run
 * parked on a wait node so it observes the cancel now, and terminates
 * the durable workflow run. Nothing further is sent; mail already
 * delivered is NOT recalled and a canceled run cannot be resumed.
 *
 * The lifecycle change is an action sub-path now: the old
 * `PATCH /v1/automations/runs` with `{ automationRunId, status }` in the
 * body is gone, and the id rides the URL.
 *
 * `409 RUN_NOT_CANCELLABLE` once the run already finished;
 * `404 AUTOMATION_RUN_NOT_FOUND` for an unknown / cross-brand id.
 * Manual-audience launches are ended with
 * `audienceRuns.cancel(audienceRunId)` instead.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<CancelAutomationRunResponse>` instead of the
 * unwrapped payload.
 */
export function createCancelAutomationRun(client: HttpClient) {
  function cancelAutomationRun(
    automationRunId: string,
    options: CancelAutomationRunOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<CancelAutomationRunResponse>>
  function cancelAutomationRun(
    automationRunId: string,
    options?: CancelAutomationRunOptions
  ): Promise<CancelAutomationRunResponse>
  async function cancelAutomationRun(
    automationRunId: string,
    options?: CancelAutomationRunOptions
  ): Promise<
    CancelAutomationRunResponse | BrewRawResponse<CancelAutomationRunResponse>
  > {
    const response = await client.request<CancelAutomationRunResponse>({
      method: 'POST',
      path: `/v1/automations/runs/${encodeURIComponent(automationRunId)}/cancel`,
      ...(options?.reason !== undefined
        ? { body: { reason: options.reason } }
        : {}),
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return cancelAutomationRun
}
