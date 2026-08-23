import { type HttpClient, unwrapResponse } from '../../../core/http'
import type { components } from '../../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../../types'

/** Path identity for `automations.triggers.ready()`. */
export type TriggerReadyInput = {
  triggerEventId: string
}

/** Same envelope as fire — `status: 'ready'` plus contract + consumers under `details`. */
export type TriggerReadyResponse = components['schemas']['TriggerFireResponse']

/**
 * `GET /v1/automations/triggers/{triggerEventId}/fire` (scope:
 * `automations`) — preflight a trigger WITHOUT firing it: verifies the
 * exact credential in use (key, brand scope, permissions) can fire this
 * trigger, and returns the payload contract plus what a fire would
 * start. `details.counts.automations: 0` means fires are accepted and
 * logged but start no runs until a wired automation is published.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<TriggerReadyResponse>` instead of the unwrapped
 * payload.
 */
export function createTriggerReady(client: HttpClient) {
  function triggerReady(
    input: TriggerReadyInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<TriggerReadyResponse>>
  function triggerReady(
    input: TriggerReadyInput,
    options?: RequestOptions
  ): Promise<TriggerReadyResponse>
  async function triggerReady(
    input: TriggerReadyInput,
    options?: RequestOptions
  ): Promise<TriggerReadyResponse | BrewRawResponse<TriggerReadyResponse>> {
    const response = await client.request<TriggerReadyResponse>({
      method: 'GET',
      path: `/v1/automations/triggers/${encodeURIComponent(input.triggerEventId)}/fire`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return triggerReady
}
