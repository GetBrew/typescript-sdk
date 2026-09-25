import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Flow } from './types'

/** The only expansion `GET /v1/flows/{slug}` accepts: each step's rendered HTML. */
export const FLOWS_INCLUDE_TOKENS = ['html'] as const
export type FlowsIncludeToken = (typeof FLOWS_INCLUDE_TOKENS)[number]

/**
 * Per-request options for `brew.flows.get(...)` — the standard
 * `RequestOptions` plus the detail-only `include` expansion.
 */
export type GetFlowOptions = RequestOptions & {
  /**
   * `'html'` attaches each step's rendered HTML — up to 12 emails,
   * best-effort per step: a step whose body is no longer servable comes
   * back without `html` rather than failing the flow. Accepts a token, an
   * array of tokens, or a comma string.
   */
  readonly include?: ReadonlyArray<FlowsIncludeToken> | string
}

/** `GET /v1/flows/{slug}` returns the BARE flow, with `anchor` and `steps[]`. */
export type GetFlowResponse = Flow

/** Serialize the `include` option into the API's comma-separated form. */
function serializeInclude(
  include: GetFlowOptions['include']
): string | undefined {
  if (include === undefined) return undefined
  const joined = typeof include === 'string' ? include : include.join(',')
  return joined.length > 0 ? joined : undefined
}

/**
 * `GET /v1/flows/{slug}` — one public flow, returned as the BARE row. The
 * slug is the brand domain every `brew.flows.list()` card carries (e.g.
 * `brew.new`, case-insensitive). The row adds `anchor` (what day 0 means)
 * and `steps[]` (`order`, `dayOffset`, `delayDays`, `subject`,
 * `previewText`, `category`, `previewImage`, `emailId`) to the card fields.
 *
 * A step's `emailId` is a template reference: pass it as `referenceEmailId`
 * on `brew.emails.generate(...)`; for the body itself pass
 * `include: 'html'` here. Organization-wide, like templates: the client
 * never sends `X-Brand-Id`. An unknown or private slug is
 * `404 FLOW_NOT_FOUND`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetFlowResponse>` instead of the unwrapped row.
 */
export function createGetFlow(client: HttpClient) {
  function getFlow(
    slug: string,
    options: GetFlowOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetFlowResponse>>
  function getFlow(
    slug: string,
    options?: GetFlowOptions
  ): Promise<GetFlowResponse>
  async function getFlow(
    slug: string,
    options?: GetFlowOptions
  ): Promise<GetFlowResponse | BrewRawResponse<GetFlowResponse>> {
    const include = serializeInclude(options?.include)
    const response = await client.request<GetFlowResponse>({
      method: 'GET',
      path: `/v1/flows/${encodeURIComponent(slug)}`,
      ...(include !== undefined ? { query: { include } } : {}),
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getFlow
}
