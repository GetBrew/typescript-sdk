import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { AudienceRunsListResponse, ListAudienceRunsInput } from './types'

export type { ListAudienceRunsInput }
export type ListAudienceRunsResponse = AudienceRunsListResponse

/**
 * `GET /v1/automations/audience-runs` (scope: `automations`) —
 * manual-audience run history, newest first, under the uniform
 * `{ data, pagination }` envelope.
 *
 * Filter with `automationId` and `status` (the one v1 vocabulary:
 * `queued | scheduled | running | paused | completed | failed |
 * canceled`); page with `limit` / `cursor`. A single run is
 * `brew.automations.audienceRuns.get(audienceRunId)` — there is no
 * `audienceRunId` filter here any more.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ListAudienceRunsResponse>` instead of the unwrapped
 * envelope.
 */
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
