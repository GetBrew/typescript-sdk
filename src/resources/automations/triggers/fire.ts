import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { components } from '../../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../../types'

/** Body for `automations.triggers.fire()` plus the `triggerEventId` path identity. */
export type FireTriggerInput = {
  triggerEventId: string
} & components['schemas']['TriggerFireRequest']

/** The legacy fire envelope `{ success, status, code, message, receivedAt, details }`. */
export type FireTriggerResponse = components['schemas']['TriggerFireResponse']

/**
 * `POST /v1/automations/triggers/{triggerEventId}/fire` (scope:
 * `automations`) — fire a trigger with a `payload`; the server validates
 * it against the trigger's `payloadSchema`, upserts the derived contact,
 * and starts one run per published automation attached to the trigger.
 *
 * Returns the legacy fire envelope (NOT the standard `{ error }` shape) —
 * read `details.automationRunIds[]` and follow each run via
 * `brew.automations.runs.get({ automationRunId })`. Set an
 * `Idempotency-Key` on retries so a re-delivered webhook doesn't
 * double-fire.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<FireTriggerResponse>` instead of the unwrapped payload.
 */
export function createFireTrigger(client: HttpClient) {
  function fireTrigger(
    input: FireTriggerInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<FireTriggerResponse>>
  function fireTrigger(
    input: FireTriggerInput,
    options?: RequestOptions
  ): Promise<FireTriggerResponse>
  async function fireTrigger(
    input: FireTriggerInput,
    options?: RequestOptions
  ): Promise<FireTriggerResponse | BrewRawResponse<FireTriggerResponse>> {
    const { triggerEventId, ...body } = input
    const response = await client.request<FireTriggerResponse>({
      method: 'POST',
      path: `/v1/automations/triggers/${encodeURIComponent(triggerEventId)}/fire`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return fireTrigger
}
