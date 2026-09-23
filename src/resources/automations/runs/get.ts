import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { AutomationRun } from './types'

/** The one expansion `GET /v1/automations/runs/{automationRunId}` accepts. */
export type AutomationRunsIncludeToken = 'logs'

/**
 * Per-request options for `brew.automations.runs.get(...)` — the
 * standard `RequestOptions` plus the detail-only `include` expansion.
 */
export type GetAutomationRunOptions = RequestOptions & {
  /**
   * `'logs'` attaches the per-node execution `logs[]`. Accepts an array of
   * tokens or a comma string.
   */
  readonly include?: ReadonlyArray<AutomationRunsIncludeToken> | string
}

/** `GET /v1/automations/runs/{automationRunId}` returns the BARE row. */
export type GetAutomationRunResponse = AutomationRun

/** Serialize the `include` option into the API's comma-separated form. */
function serializeInclude(
  include: GetAutomationRunOptions['include']
): string | undefined {
  if (include === undefined) return undefined
  const joined = typeof include === 'string' ? include : include.join(',')
  return joined.length > 0 ? joined : undefined
}

/**
 * `GET /v1/automations/runs/{automationRunId}` (scope: `automations`) —
 * one automation run, returned as the BARE row. Pass `include: 'logs'`
 * for the per-node execution `logs[]` (each node reports `running |
 * completed | failed | skipped`).
 *
 * An unknown or cross-brand id is `404 AUTOMATION_RUN_NOT_FOUND` — it is
 * no longer an empty page you have to test for.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetAutomationRunResponse>` instead of the unwrapped
 * row.
 */
export function createGetAutomationRun(client: HttpClient) {
  function getAutomationRun(
    automationRunId: string,
    options: GetAutomationRunOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetAutomationRunResponse>>
  function getAutomationRun(
    automationRunId: string,
    options?: GetAutomationRunOptions
  ): Promise<GetAutomationRunResponse>
  async function getAutomationRun(
    automationRunId: string,
    options?: GetAutomationRunOptions
  ): Promise<
    GetAutomationRunResponse | BrewRawResponse<GetAutomationRunResponse>
  > {
    const include = serializeInclude(options?.include)
    const response = await client.request<GetAutomationRunResponse>({
      method: 'GET',
      path: `/v1/automations/runs/${encodeURIComponent(automationRunId)}`,
      ...(include !== undefined ? { query: { include } } : {}),
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getAutomationRun
}
