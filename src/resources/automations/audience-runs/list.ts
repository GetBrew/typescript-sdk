import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { AudienceRunsListResponse, ListAudienceRunsInput } from './types'

export type { ListAudienceRunsInput }
export type ListAudienceRunsResponse = AudienceRunsListResponse

export function createListAudienceRuns(client: HttpClient) {
  function listAudienceRuns(
    input: ListAudienceRunsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListAudienceRunsResponse>>
  function listAudienceRuns(
    input?: ListAudienceRunsInput,
    options?: RequestOptions
  ): Promise<ListAudienceRunsResponse>
  async function listAudienceRuns(
    input: ListAudienceRunsInput = {},
    options?: RequestOptions
  ): Promise<
    ListAudienceRunsResponse | BrewRawResponse<ListAudienceRunsResponse>
  > {
    const response = await client.request<ListAudienceRunsResponse>({
      method: 'GET',
      path: '/v1/automations/audience-runs',
      query: {
        automationId: input.automationId,
        status: input.status,
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listAudienceRuns
}
