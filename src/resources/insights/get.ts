import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Insight } from './types'

/** `GET /v1/insights/{insightId}` returns the BARE finding. */
export type GetInsightResponse = Insight

/**
 * `GET /v1/insights/{insightId}` (scope: `emails`) — one finding in full,
 * as its page in Brew reads it: the list row's fields plus `rationale`,
 * `closedReason`, `closedAt`, `lastActedAt`, `churnCount`, the frozen
 * `metrics`, `evidence` links, its `subject`, the detector's `method` (what
 * it measures, how, against what, and what resolves it), `generatedBy` (the
 * engine run that produced it and what that run could not see) and
 * `freshness`. Read-only and free.
 *
 * Use it to explain why a finding exists or what would resolve it.
 * `metrics` were frozen when the finding was computed and are the only
 * numbers to quote about it.
 *
 * `404 INSIGHT_NOT_FOUND` for an unknown, malformed or over-long id OR a
 * finding of another brand: one identical error, so the cases are
 * indistinguishable.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetInsightResponse>` instead of the unwrapped row.
 */
export function createGetInsight(client: HttpClient) {
  function getInsight(
    insightId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetInsightResponse>>
  function getInsight(
    insightId: string,
    options?: RequestOptions
  ): Promise<GetInsightResponse>
  async function getInsight(
    insightId: string,
    options?: RequestOptions
  ): Promise<GetInsightResponse | BrewRawResponse<GetInsightResponse>> {
    const response = await client.request<GetInsightResponse>({
      method: 'GET',
      path: `/v1/insights/${encodeURIComponent(insightId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getInsight
}
