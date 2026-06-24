import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { AutomationRunsListResponse } from './types'

/**
 * Input to `brew.automations.runs.list(...)` — the single automation-run
 * read. Reads are flat: identity lives in the query.
 *
 * - Omit `automationRunId` to LIST recent runs (newest first), filtered
 *   by `automationId`, `triggerEventId`, `triggerInstanceId`,
 *   `recipientEmail`, `status`, `mode`, and the `from` / `to` window.
 * - Pass `automationRunId` to fetch ONE — the response is a single-row
 *   page `{ data: [row] }` (no `pagination`). Add `include: 'logs'`
 *   (detail-only) for the per-node execution `logs[]`.
 */
export type AutomationRunsIncludeToken = 'logs'

export type ListAutomationRunsInput = {
  /** Fetch one run by id (detail mode → single-row page). Omit to list. */
  readonly automationRunId?: string
  /**
   * Detail-only expansion (requires `automationRunId`). `'logs'` attaches
   * the per-node execution `logs[]`. Accepts an array of `'logs'` tokens
   * or a comma string.
   */
  readonly include?: ReadonlyArray<AutomationRunsIncludeToken> | string
  readonly automationId?: string
  readonly triggerEventId?: string
  readonly triggerInstanceId?: string
  readonly recipientEmail?: string
  readonly status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  readonly mode?: 'live' | 'test'
  readonly from?: string
  readonly to?: string
  readonly limit?: number
  readonly cursor?: string
}

export type ListAutomationRunsResponse = AutomationRunsListResponse

/** Serialize the `include` option into the API's comma-separated form. */
function serializeInclude(
  include: ListAutomationRunsInput['include']
): string | undefined {
  if (include === undefined) return undefined
  const joined = typeof include === 'string' ? include : include.join(',')
  return joined.length > 0 ? joined : undefined
}

/**
 * `GET /v1/automations/runs` (scope: `automations`) — the single
 * automation-run read, under the uniform `{ data, pagination? }`
 * envelope. Reads are flat: the identity lives in the query.
 *
 * - List mode (no `automationRunId`): recent runs, newest first. Filter
 *   with `automationId`, `triggerEventId`, `triggerInstanceId`,
 *   `recipientEmail`, `status` (pending | running | completed | failed |
 *   cancelled), `mode` (live | test), and the `from` / `to` ISO-8601
 *   window. List rows omit per-node logs.
 * - Detail mode (`automationRunId` set): a single-row page
 *   `{ data: [row] }` with no `pagination`. Add `include: 'logs'` for
 *   the per-node execution `logs[]` (an `include` without
 *   `automationRunId` is `400 INVALID_REQUEST`).
 *
 * Unknown / cross-brand ids return an empty page in detail mode.
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
    const { include, ...rest } = input
    const query: Record<string, string> = {}
    for (const [key, value] of Object.entries(rest)) {
      if (value === undefined) continue
      if (typeof value === 'string') {
        query[key] = value
      } else if (typeof value === 'number') {
        query[key] = String(value)
      }
    }
    const serializedInclude = serializeInclude(include)
    if (serializedInclude !== undefined) query.include = serializedInclude
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
