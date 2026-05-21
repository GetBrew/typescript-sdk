import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { AutomationRunsListResponse } from './types'

export type CancelAutomationRunInput = {
  automationRunId: string
  /** Optional human-readable reason persisted on the run. */
  reason?: string
}

export type CancelAutomationRunResponse = AutomationRunsListResponse

/**
 * `PATCH /v1/automation/runs` cancel — currently returns `501
 * NOT_IMPLEMENTED` while the workflow cancel hook (P7) ships.
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
    | CancelAutomationRunResponse
    | BrewRawResponse<CancelAutomationRunResponse>
  > {
    const response = await client.request<CancelAutomationRunResponse>({
      method: 'PATCH',
      path: '/v1/automation/runs',
      body: { ...input, status: 'cancelled' as const },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return cancelAutomationRun
}
