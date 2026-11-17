import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { components } from '../../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../../types'

/**
 * Which Brew event starts the trigger, and for which occurrences.
 * `contact.unsubscribed` is a contact unsubscribing with an email's
 * unsubscribe link or their mail app's one-click button (never a bounce,
 * complaint, import or API edit). `scope: 'domain'` watches one marketing
 * domain's list (pass its `domainId` from `brew.domains.list()`);
 * `scope: 'all'` watches every email the brand sends.
 */
export type EnsureBrewEventTriggerInput =
  components['schemas']['BrewEventTriggersPostRequest']

/**
 * The brand's trigger for that scope: the bare `Trigger` row with
 * `provider: 'brew_event'` and its `brewEvent` config, plus `created` —
 * `true` when this call created it (HTTP 201), `false` when it already
 * existed (HTTP 200).
 */
export type EnsureBrewEventTriggerResponse =
  components['schemas']['BrewEventTriggerSaved']

/**
 * `POST /v1/automations/triggers/brew-events` — get or create the brand's
 * Brew-event trigger for one scope. The same input always returns the same
 * trigger. Brew owns its title and payload, so the row is immutable, and
 * Brew starts it itself: `fire` and `readiness` refuse it with
 * `409 TRIGGER_NOT_FIREABLE`. Try an automation on it with
 * `brew.automations.test(...)`.
 */
export function createEnsureBrewEventTrigger(client: HttpClient) {
  function ensureBrewEvent(
    input: EnsureBrewEventTriggerInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<EnsureBrewEventTriggerResponse>>
  function ensureBrewEvent(
    input: EnsureBrewEventTriggerInput,
    options?: RequestOptions
  ): Promise<EnsureBrewEventTriggerResponse>
  async function ensureBrewEvent(
    input: EnsureBrewEventTriggerInput,
    options?: RequestOptions
  ): Promise<
    | EnsureBrewEventTriggerResponse
    | BrewRawResponse<EnsureBrewEventTriggerResponse>
  > {
    const response = await client.request<EnsureBrewEventTriggerResponse>({
      method: 'POST',
      path: '/v1/automations/triggers/brew-events',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return ensureBrewEvent
}
