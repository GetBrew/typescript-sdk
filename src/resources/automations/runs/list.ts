import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type {
  AutomationRunsListResponse,
  ListAutomationRunsInput,
} from './types'

export type { ListAutomationRunsInput }
export type ListAutomationRunsResponse = AutomationRunsListResponse

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
        recipientEmail: input.recipientEmail,
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
