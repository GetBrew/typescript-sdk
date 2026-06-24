import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type {
  AutomationRunDetailResponse,
  AutomationRunsListResponse,
} from './types'

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
}

export type ListAutomationRunsResponse = AutomationRunsListResponse

/**
 * `GET /v1/automations/runs` — list recent automation runs
 * (newest first) under a `{ data, pagination }` envelope. Requires the
 * `automations` scope.
 *
 * Filter with `automationId`, `triggerEventId`, `triggerInstanceId`,
 * `recipientEmail`, `status` (pending | running | completed | failed |
 * cancelled), `mode` (live | test), and the `from` / `to` ISO-8601
 * window. List rows omit per-node logs — fetch a single run with `get`
 * to read its `logs[]`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ListAutomationRunsResponse>` instead of the
 * unwrapped payload.
 */
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
      if (typeof value === 'string') {
        query[key] = value
      } else if (typeof value === 'number') {
        query[key] = String(value)
      }
    }
    const response = await client.request<ListAutomationRunsResponse>({
      method: 'GET',
      path: '/v1/automations/runs',
      query,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listAutomationRuns
}

export type GetAutomationRunInput = {
  automationRunId: string
}

/**
 * Single-run fetch returns the bare run with its per-node `logs[]`
 * always attached — one log row per executed node (`trigger | wait |
 * filter | split | sendEmail`) with status, branch, timing, and error
 * detail.
 */
export type GetAutomationRunResponse = AutomationRunDetailResponse

/**
 * `GET /v1/automations/runs/{automationRunId}` — fetch one
 * automation run with its per-node `logs[]`. Requires the `automations`
 * scope.
 *
 * An unknown or cross-brand `automationRunId` is a `404
 * AUTOMATION_RUN_NOT_FOUND`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetAutomationRunResponse>` instead of the unwrapped
 * payload.
 */
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
    const response = await client.request<GetAutomationRunResponse>({
      method: 'GET',
      path: `/v1/automations/runs/${encodeURIComponent(input.automationRunId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getAutomationRun
}
