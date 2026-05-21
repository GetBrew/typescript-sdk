import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { AutomationRunsListResponse } from './types'

export type ListAutomationRunsInput = {
  automationId?: string
  triggerEventId?: string
  triggerInstanceId?: string
  recipientEmail?: string
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  mode?: 'live' | 'test'
  from?: string
  to?: string
  limit?: number
  cursor?: string
  include?: ReadonlyArray<'logs'>
}

export type ListAutomationRunsResponse = AutomationRunsListResponse

export function createListAutomationRuns(client: HttpClient) {
  function listAutomationRuns(
    input: ListAutomationRunsInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListAutomationRunsResponse>>
  function listAutomationRuns(
    input?: ListAutomationRunsInput,
    options?: RequestOptions
  ): Promise<ListAutomationRunsResponse>
  async function listAutomationRuns(
    input: ListAutomationRunsInput = {},
    options?: RequestOptions
  ): Promise<
    ListAutomationRunsResponse | BrewRawResponse<ListAutomationRunsResponse>
  > {
    const query: Record<string, string> = {}
    for (const [key, value] of Object.entries(input)) {
      if (value === undefined) continue
      if (key === 'include' && Array.isArray(value)) {
        query[key] = value.join(',')
      } else if (typeof value === 'string') {
        query[key] = value
      } else if (typeof value === 'number') {
        query[key] = String(value)
      }
    }
    const response = await client.request<ListAutomationRunsResponse>({
      method: 'GET',
      path: '/v1/automation/runs',
      query,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listAutomationRuns
}

export type GetAutomationRunInput = {
  automationRunId: string
  include?: ReadonlyArray<'logs'>
}

/**
 * Single-row fetch returns the same `{ runs: [...] }` envelope as
 * list mode — a one-element array (or `404
 * AUTOMATION_RUN_NOT_FOUND` when missing). Use `result.runs[0]` to
 * destructure the row.
 */
export type GetAutomationRunResponse = ListAutomationRunsResponse

export function createGetAutomationRun(client: HttpClient) {
  function getAutomationRun(
    input: GetAutomationRunInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetAutomationRunResponse>>
  function getAutomationRun(
    input: GetAutomationRunInput,
    options?: RequestOptions
  ): Promise<GetAutomationRunResponse>
  async function getAutomationRun(
    input: GetAutomationRunInput,
    options?: RequestOptions
  ): Promise<
    GetAutomationRunResponse | BrewRawResponse<GetAutomationRunResponse>
  > {
    const query: Record<string, string> = {
      automationRunId: input.automationRunId,
    }
    if (input.include && input.include.length > 0) {
      query.include = input.include.join(',')
    }
    const response = await client.request<GetAutomationRunResponse>({
      method: 'GET',
      path: '/v1/automation/runs',
      query,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getAutomationRun
}
