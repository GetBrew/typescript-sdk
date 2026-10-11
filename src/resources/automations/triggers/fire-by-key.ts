import { type HttpClient, unwrapResponse } from '../../../core/http'
import type { components } from '../../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { DefaultFirePayload } from './fire'

/**
 * Body for `automations.triggers.fireByKey()` plus the `triggerKey` path
 * identity: the developer key set on the trigger (`key` on its row), such
 * as `order.paid` or `auth.password-reset`. Generic over the payload
 * exactly like `fire`:
 *
 * ```ts
 * await brew.automations.triggers.fireByKey<OrderPaidPayload>(
 *   { triggerKey: 'order.paid', payload: { email, orderId, total } },
 *   { idempotencyKey: `order.paid:${orderId}` }
 * )
 * ```
 *
 * For app email, `brew.send(key, payload)` is the same call in one line.
 */
export type FireTriggerByKeyInput<
  TPayload extends Record<string, unknown> = DefaultFirePayload,
> = {
  triggerKey: string
} & Omit<components['schemas']['TriggerFireRequest'], 'payload'> & {
    payload: TPayload
  }

/**
 * The fire body, plus `triggerKey`: `{ triggerInstanceId, triggerEventId,
 * triggerKey, status, automationRunIds, notStarted, publishedAutomations,
 * counts, warnings, receivedAt }`. `status: 'replayed'` (HTTP 200) when the
 * same `Idempotency-Key` already fired the resolved trigger.
 */
export type FireTriggerByKeyResponse =
  components['schemas']['TriggerFireAccepted']

/**
 * `.` and `..` survive `encodeURIComponent` and a URL resolves them as
 * dot segments, so they would address another route. The API's key grammar
 * never produces them (nor an empty key); refuse them before any request.
 */
function assertTriggerKey(triggerKey: unknown): asserts triggerKey is string {
  if (
    typeof triggerKey !== 'string' ||
    triggerKey === '' ||
    triggerKey === '.' ||
    triggerKey === '..'
  ) {
    throw new TypeError(
      `fireByKey: \`triggerKey\` must be a trigger key such as 'order.paid'; got ${JSON.stringify(triggerKey)}.`
    )
  }
}

/**
 * `POST /v1/automations/triggers/by-key/{triggerKey}/fire` (scope:
 * `automations`) — fire the trigger whose `key` matches, exactly as `fire`
 * does by id: the server validates the payload against the trigger's
 * `payloadSchema`, upserts the contact, and starts one run per published
 * automation attached to the trigger. The key resolves inside the brand
 * the credential acts for; an unknown key is `404 TRIGGER_KEY_NOT_FOUND`.
 *
 * Idempotency matches the RESOLVED trigger, so a by-key and a by-id fire of
 * one trigger with the same `options.idempotencyKey` replay each other.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<FireTriggerByKeyResponse>` instead of the unwrapped body.
 */
export function createFireTriggerByKey(client: HttpClient) {
  function fireTriggerByKey<
    TPayload extends Record<string, unknown> = DefaultFirePayload,
  >(
    input: FireTriggerByKeyInput<TPayload>,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<FireTriggerByKeyResponse>>
  function fireTriggerByKey<
    TPayload extends Record<string, unknown> = DefaultFirePayload,
  >(
    input: FireTriggerByKeyInput<TPayload>,
    options?: RequestOptions
  ): Promise<FireTriggerByKeyResponse>
  async function fireTriggerByKey(
    input: FireTriggerByKeyInput,
    options?: RequestOptions
  ): Promise<
    FireTriggerByKeyResponse | BrewRawResponse<FireTriggerByKeyResponse>
  > {
    const { triggerKey, ...body } = input
    assertTriggerKey(triggerKey)
    const response = await client.request<FireTriggerByKeyResponse>({
      method: 'POST',
      path: `/v1/automations/triggers/by-key/${encodeURIComponent(triggerKey)}/fire`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return fireTriggerByKey
}
