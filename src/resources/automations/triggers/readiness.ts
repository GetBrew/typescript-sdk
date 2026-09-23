import { type HttpClient, unwrapResponse } from '../../../core/http'
import type { components } from '../../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../../types'

/**
 * The BARE readiness body — `{ triggerEventId, ready, blockers[],
 * publishedAutomations[], counts }` plus the payload contract. No fire
 * envelope wrapped around it any more.
 */
export type TriggerReadinessResponse = components['schemas']['TriggerReadiness']

/** One reason a fire would start nothing (today: `NO_PUBLISHED_AUTOMATION`). */
export type TriggerReadinessBlocker =
  TriggerReadinessResponse['blockers'][number]

/**
 * `GET /v1/automations/triggers/{triggerEventId}/readiness` (scope:
 * `automations`) — preflight a trigger WITHOUT firing it: verifies the
 * exact credential in use (key, brand scope, permissions) can fire this
 * trigger, and returns the payload contract plus what a fire would
 * start.
 *
 * `ready: false` with a `NO_PUBLISHED_AUTOMATION` blocker (and
 * `counts.automations: 0`) means fires are accepted and logged but start
 * no runs until a wired automation is published.
 *
 * This replaced the old `GET …/fire` preflight, which overloaded the
 * fire path and answered in the fire envelope.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<TriggerReadinessResponse>` instead of the unwrapped
 * payload.
 */
export function createTriggerReadiness(client: HttpClient) {
  function triggerReadiness(
    triggerEventId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<TriggerReadinessResponse>>
  function triggerReadiness(
    triggerEventId: string,
    options?: RequestOptions
  ): Promise<TriggerReadinessResponse>
  async function triggerReadiness(
    triggerEventId: string,
    options?: RequestOptions
  ): Promise<
    TriggerReadinessResponse | BrewRawResponse<TriggerReadinessResponse>
  > {
    const response = await client.request<TriggerReadinessResponse>({
      method: 'GET',
      path: `/v1/automations/triggers/${encodeURIComponent(triggerEventId)}/readiness`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return triggerReadiness
}
