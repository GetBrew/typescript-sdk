import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { AutomationRunCancelResponse } from './types'

export type CancelAutomationRunOptions = RequestOptions & {
  readonly reason?: string
}

export type CancelAutomationRunResponse = AutomationRunCancelResponse

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
