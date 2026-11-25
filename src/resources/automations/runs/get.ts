import { unwrapResponse, type HttpClient } from '../../../core/http'
import { serializeInclude } from '../../../core/url'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { AutomationRun } from './types'

export const AUTOMATION_RUNS_INCLUDE_TOKENS = ['logs'] as const
export type AutomationRunsIncludeToken =
  (typeof AUTOMATION_RUNS_INCLUDE_TOKENS)[number]

export type GetAutomationRunOptions = RequestOptions & {
  readonly include?: ReadonlyArray<AutomationRunsIncludeToken> | string
}

export type GetAutomationRunResponse = AutomationRun

export function createGetAutomationRun(client: HttpClient) {
  function getAutomationRun(
    automationRunId: string,
    options: GetAutomationRunOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetAutomationRunResponse>>
  function getAutomationRun(
    automationRunId: string,
    options?: GetAutomationRunOptions
  ): Promise<GetAutomationRunResponse>
  async function getAutomationRun(
    automationRunId: string,
    options?: GetAutomationRunOptions
  ): Promise<
    GetAutomationRunResponse | BrewRawResponse<GetAutomationRunResponse>
  > {
    const include = serializeInclude({ include: options?.include })
    const response = await client.request<GetAutomationRunResponse>({
      method: 'GET',
      path: `/v1/automations/runs/${encodeURIComponent(automationRunId)}`,
      ...(include !== undefined ? { query: { include } } : {}),
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getAutomationRun
}
