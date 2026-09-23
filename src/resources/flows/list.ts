import { unwrapResponse, type HttpClient } from '../../core/http'
import type { operations } from '../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { FlowsListResponse } from './types'

type ListFlowsQuery = NonNullable<
  operations['listFlows']['parameters']['query']
>

/**
 * Input to `brew.flows.list(...)`: the gallery's cards, filtered by `brand`
 * (domain), `category`, `type` (`signup` | `newsletter`) or ranked by
 * `semantic`; ordered with `sort` (`newest` | `emails` | `span` | `remixes`;
 * ignored under `semantic`); paged with `limit` / `cursor`. One flow with its
 * steps is `brew.flows.get(slug, { include? })`.
 */
export type ListFlowsInput = ListFlowsQuery

export type ListFlowsResponse = FlowsListResponse

export type { FlowsListResponse }

/**
 * `GET /v1/flows` — list public email flows as cards under the uniform
 * `{ data, pagination }` envelope. A flow is one brand's real sequence —
 * onboarding drip, newsletter cadence, win-back — with the day each email
 * landed. Cards carry `slug`, `brand`, `type`, `category`, `emailCount`,
 * `spanDays`, `remixCount` and `previewImages`; `anchor` and `steps[]` are
 * on `brew.flows.get(slug)`. Flows are organization-wide, like templates:
 * the client never sends `X-Brand-Id` here.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ListFlowsResponse>` instead of the unwrapped envelope.
 */
export function createListFlows(client: HttpClient) {
  function listFlows(
    input: ListFlowsInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListFlowsResponse>>
  function listFlows(
    input?: ListFlowsInput,
    options?: RequestOptions
  ): Promise<ListFlowsResponse>
  async function listFlows(
    input: ListFlowsInput = {},
    options?: RequestOptions
  ): Promise<ListFlowsResponse | BrewRawResponse<ListFlowsResponse>> {
    const query: Record<string, string> = {}
    for (const [key, value] of Object.entries(input)) {
      if (value === undefined) continue
      if (typeof value === 'string') {
        query[key] = value
      } else if (typeof value === 'number') {
        query[key] = String(value)
      }
    }
    const response = await client.request<ListFlowsResponse>({
      method: 'GET',
      path: '/v1/flows',
      query,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listFlows
}
