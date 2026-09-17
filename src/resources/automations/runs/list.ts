import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type {
  AutomationRunsListResponse,
  ListAutomationRunsInput,
} from './types'

export type { ListAutomationRunsInput }
export type ListAutomationRunsResponse = AutomationRunsListResponse

/**
 * `GET /v1/automations/runs` (scope: `automations`) — recent automation
 * runs, newest first, under the uniform `{ data, pagination }` envelope.
 * List rows omit per-node logs.
 *
 * Filter with `automationId`, `triggerEventId`, `triggerInstanceId`,
 * `status` (`queued | running | completed | failed | canceled`), `mode`
 * (`live` | `test`), and the `from` / `to` ISO-8601 window; page with
 * `limit` / `cursor`. A single run is
 * `brew.automations.runs.get(automationRunId, { include: 'logs' })` —
 * there is no `automationRunId` filter here any more.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ListAutomationRunsResponse>` instead of the
 * unwrapped payload.
 */
export function createListAutomationRuns(client: HttpClient) {
  function listAutomationRuns(
    input: ListAutomationRunsInput | undefined,
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
    const response = await client.request<ListAutomationRunsResponse>({
      method: 'GET',
      path: '/v1/automations/runs',
      query: {
        automationId: input.automationId,
        triggerEventId: input.triggerEventId,
        triggerInstanceId: input.triggerInstanceId,
        status: input.status,
        mode: input.mode,
        from: input.from,
        to: input.to,
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listAutomationRuns
}
