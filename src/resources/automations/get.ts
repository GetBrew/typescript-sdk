import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Automation } from './types'

/** Expansions `GET /v1/automations/{automationId}` accepts. */
export type AutomationsIncludeToken = 'graph' | 'versions'

/**
 * Per-request options for `brew.automations.get(...)` — the standard
 * `RequestOptions` plus the detail-only `include` expansions.
 */
export type GetAutomationOptions = RequestOptions & {
  /**
   * `'graph'` attaches `nodes` + `connections`; `'versions'` attaches
   * the inline version history. Accepts an array of tokens or a comma
   * string.
   */
  readonly include?: ReadonlyArray<AutomationsIncludeToken> | string
}

/** `GET /v1/automations/{automationId}` returns the BARE `AutomationRow`. */
export type GetAutomationResponse = Automation

/** Serialize the `include` option into the API's comma-separated form. */
function serializeInclude(
  include: GetAutomationOptions['include']
): string | undefined {
  if (include === undefined) return undefined
  const joined = typeof include === 'string' ? include : include.join(',')
  return joined.length > 0 ? joined : undefined
}

/**
 * `GET /v1/automations/{automationId}` (scope: `automations`) — one
 * automation, returned as the BARE row. Lean by default: pass
 * `include: 'graph'` for `nodes` + `connections` and/or
 * `include: 'versions'` for the inline version history.
 *
 * An unknown or cross-brand id is `404 AUTOMATION_NOT_FOUND` — it is no
 * longer an empty page you have to test for.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetAutomationResponse>` instead of the unwrapped row.
 */
export function createGetAutomation(client: HttpClient) {
  function getAutomation(
    automationId: string,
    options: GetAutomationOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetAutomationResponse>>
  function getAutomation(
    automationId: string,
    options?: GetAutomationOptions
  ): Promise<GetAutomationResponse>
  async function getAutomation(
    automationId: string,
    options?: GetAutomationOptions
  ): Promise<GetAutomationResponse | BrewRawResponse<GetAutomationResponse>> {
    const include = serializeInclude(options?.include)
    const response = await client.request<GetAutomationResponse>({
      method: 'GET',
      path: `/v1/automations/${encodeURIComponent(automationId)}`,
      ...(include !== undefined ? { query: { include } } : {}),
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getAutomation
}
