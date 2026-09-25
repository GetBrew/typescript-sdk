import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { Trigger } from './types'

/** Expansions `GET /v1/automations/triggers/{triggerEventId}` accepts. */
export const TRIGGERS_INCLUDE_TOKENS = ['skill'] as const
export type TriggersIncludeToken = (typeof TRIGGERS_INCLUDE_TOKENS)[number]

/**
 * Per-request options for `brew.automations.triggers.get(...)` — the
 * standard `RequestOptions` plus the detail-only `include` expansion.
 */
export type GetTriggerOptions = RequestOptions & {
  /**
   * `'skill'` adds `skill`: a SKILL.md-shaped brief for wiring the fire
   * endpoint. Accepts an array of tokens or a comma string.
   */
  readonly include?: ReadonlyArray<TriggersIncludeToken> | string
}

/** `GET /v1/automations/triggers/{triggerEventId}` returns the BARE row. */
export type GetTriggerResponse = Trigger

/** Serialize the `include` option into the API's comma-separated form. */
function serializeInclude(
  include: GetTriggerOptions['include']
): string | undefined {
  if (include === undefined) return undefined
  const joined = typeof include === 'string' ? include : include.join(',')
  return joined.length > 0 ? joined : undefined
}

/**
 * `GET /v1/automations/triggers/{triggerEventId}` (scope: `automations`)
 * — one trigger, returned as the BARE row.
 *
 * An unknown or cross-brand id is `404 TRIGGER_EVENT_NOT_FOUND` — it is
 * no longer an empty page you have to test for. For whether a fire would
 * actually start anything, use
 * `brew.automations.triggers.readiness(triggerEventId)`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetTriggerResponse>` instead of the unwrapped row.
 */
export function createGetTrigger(client: HttpClient) {
  function getTrigger(
    triggerEventId: string,
    options: GetTriggerOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetTriggerResponse>>
  function getTrigger(
    triggerEventId: string,
    options?: GetTriggerOptions
  ): Promise<GetTriggerResponse>
  async function getTrigger(
    triggerEventId: string,
    options?: GetTriggerOptions
  ): Promise<GetTriggerResponse | BrewRawResponse<GetTriggerResponse>> {
    const include = serializeInclude(options?.include)
    const response = await client.request<GetTriggerResponse>({
      method: 'GET',
      path: `/v1/automations/triggers/${encodeURIComponent(triggerEventId)}`,
      ...(include !== undefined ? { query: { include } } : {}),
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getTrigger
}
