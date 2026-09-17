import { unwrapResponse, type HttpClient } from '../../core/http'
import type { operations } from '../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { FlowsListResponse } from './types'

type ListFlowsQuery = NonNullable<
  operations['listFlows']['parameters']['query']
>

/** The only detail-only expansion: each step's rendered HTML. */
export type FlowsIncludeToken = 'html'

/**
 * Input to `brew.flows.list(...)` — the single public-flow read. Reads are
 * flat: identity lives in the query.
 *
 * - Omit `slug` to LIST cards, filtered by `brand` (domain), `category`,
 *   `type` (`signup` | `newsletter`) or ranked by `semantic`; order with
 *   `sort` (`newest` | `emails` | `span` | `remixes`; ignored under
 *   `semantic`).
 * - Pass `slug` (the brand domain, e.g. `brew.new`) to fetch ONE flow —
 *   a single-row page `{ data: [flow] }` (no `pagination`) with `anchor`
 *   and every `steps[]` entry. Add `include: 'html'` (detail-only) for
 *   each step's rendered HTML.
 */
export type ListFlowsInput = Omit<ListFlowsQuery, 'include'> & {
  /**
   * Detail-only expansion (requires `slug`). `'html'` attaches each step's
   * rendered HTML — up to 12 emails, best-effort per step. Accepts an array
   * of tokens or a comma string.
   */
  readonly include?: ReadonlyArray<FlowsIncludeToken> | string
}

export type ListFlowsResponse = FlowsListResponse

export type { FlowsListResponse }

/** Serialize the `include` option into the API's comma-separated form. */
function serializeInclude(
  include: ListFlowsInput['include']
): string | undefined {
  if (include === undefined) return undefined
  const joined = typeof include === 'string' ? include : include.join(',')
  return joined.length > 0 ? joined : undefined
}

/**
 * `GET /v1/flows` — list public email flows (scope: `emails`), or fetch
 * one by `slug`, under the uniform `{ data, pagination? }` envelope.
 *
 * A flow is one brand's real sequence — onboarding drip, newsletter
 * cadence, win-back — with the day each email landed. Cards carry `brand`,
 * `type`, `category`, `emailCount`, `spanDays`, `remixCount` and
 * `previewImages`; the detail read adds `anchor` (what day 0 means) and
 * `steps[]` (`order`, `dayOffset`, `delayDays`, `subject`, `previewText`,
 * `category`, `previewImage`, `emailId`). `include: 'html'` is best-effort
 * per step — a step whose body is no longer servable comes back without
 * `html` rather than failing the whole flow. Flows are organization-wide,
 * like templates: the client never sends `X-Brand-Id` here. An unknown `slug` is
 * `404 FLOW_NOT_FOUND`; an `include` without `slug` is `400 INVALID_REQUEST`.
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
