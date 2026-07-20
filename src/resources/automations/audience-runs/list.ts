import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { operations } from '../../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { AudienceRunsListResponse } from './types'

/** List filters, or `audienceRunId` for a single-row detail page. */
export type ListAudienceRunsInput = NonNullable<
  operations['listAudienceRuns']['parameters']['query']
>
export type ListAudienceRunsResponse = AudienceRunsListResponse

/** `GET /v1/automations/audience-runs` — manual-audience run history. */
export function createListAudienceRuns(client: HttpClient) {
  function listAudienceRuns(
    input: ListAudienceRunsInput,
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
        audienceRunId: input.audienceRunId,
        automationId: input.automationId,
        limit: input.limit,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listAudienceRuns
}
