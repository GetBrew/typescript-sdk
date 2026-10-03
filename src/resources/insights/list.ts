import { unwrapResponse, type HttpClient } from '../../core/http'
import { serializeInclude } from '../../core/url'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { InsightsListResponse, ListInsightsQuery } from './types'

/** The expansions `GET /v1/insights` accepts. */
export const INSIGHTS_INCLUDE_TOKENS = [
  'pulse',
  'report',
  'suggestions',
  'memo',
] as const
export type InsightsIncludeToken = (typeof INSIGHTS_INCLUDE_TOKENS)[number]

/**
 * Input to `brew.insights.list(...)`: the generated query with `include`
 * typed as its tokens.
 *
 * - `state`: `open` (the default) lists active findings and snoozes that
 *   have ended; `all` adds resolved, cleared, dismissed and stale findings
 *   and snoozes still in effect.
 * - `severity`: only findings of this severity, up to 200 of its own
 *   however many more severe findings exist.
 * - `limit` (1–100, default 100) / `cursor`: page through the findings.
 */
export type ListInsightsInput = Readonly<
  Omit<ListInsightsQuery, 'include'> & {
    /**
     * The intelligence layer the Insights page shows beside the findings:
     * `'pulse'` (the last 7 days against the 7 before), `'report'` (the
     * latest report the analysis agent published), `'suggestions'` (its
     * proposed and launched suggestions, up to 25) and `'memo'` (the
     * agent's memory across runs). `pulse`, `report` and `memo` are `null`
     * until they exist; `suggestions` is an empty array.
     * They are page-level keys, not row fields, so ask for them on the
     * first page only. Accepts an array of tokens or a comma string.
     */
    readonly include?: ReadonlyArray<InsightsIncludeToken> | string
  }
>

export type ListInsightsResponse = InsightsListResponse

/**
 * `GET /v1/insights` (scope: `emails`) — the brand's Brew Insights as the
 * Insights page ranks them, most severe first and then by score, under
 * `{ data, pagination, freshness }`. Each row is one deterministic finding
 * of the insight engine (deliverability problems, campaigns that under- or
 * over-performed, timing, audience and automation opportunities); the
 * engine keeps at most 200 findings in view. Read-only and free.
 *
 * `freshness` is on every page: `dataAsOf` is how current the data behind
 * the findings is, and `latestAttempt.status: 'failed'` means they may be
 * stale. `include` adds `pulse`, `report`, `suggestions` and `memo`.
 *
 * One finding in full is `brew.insights.get(insightId)`. An unknown query
 * value or `include` token, or a malformed `cursor`, is
 * `400 INVALID_REQUEST`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ListInsightsResponse>` instead of the unwrapped page.
 */
export function createListInsights(client: HttpClient) {
  function listInsights(
    input: ListInsightsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListInsightsResponse>>
  function listInsights(
    input?: ListInsightsInput,
    options?: RequestOptions
  ): Promise<ListInsightsResponse>
  async function listInsights(
    input: ListInsightsInput = {},
    options?: RequestOptions
  ): Promise<ListInsightsResponse | BrewRawResponse<ListInsightsResponse>> {
    const response = await client.request<ListInsightsResponse>({
      method: 'GET',
      path: '/v1/insights',
      query: {
        state: input.state,
        severity: input.severity,
        include: serializeInclude({ include: input.include }),
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listInsights
}
