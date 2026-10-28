import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { components, operations } from '../../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../../types'

/**
 * The live integration event to get a trigger for: `eventId` from
 * `brew.integrations.events.list()`. Never compose one from a provider and
 * an event name.
 */
export type EnsureIntegrationEventTriggerInput =
  components['schemas']['IntegrationEventTriggersPostRequest']

type Responses = operations['ensureIntegrationEventTrigger']['responses']

/** `200`: the trigger already existed. `201`: this call created it. */
type SavedStatus = 200 | 201

/**
 * The event's trigger: `triggerEventId`, `title`, `provider` (the event's
 * provider, e.g. `'posthog'`), `providerEventKey` (its event name),
 * `payloadSchema` and timestamps, plus `created` — `true` when this call
 * created it (HTTP 201), `false` when it already existed (HTTP 200). Both
 * statuses answer this one shape.
 *
 * Derived from the operation, not a named component, so it survives the
 * response moving to its own schema. `brewEvent` and `skill` are left out:
 * an integration event's trigger never carries them.
 */
export type EnsureIntegrationEventTriggerResponse = Omit<
  Responses[SavedStatus]['content']['application/json'],
  'brewEvent' | 'skill'
>

/**
 * `POST /v1/automations/triggers/integration-events` — get or create the
 * trigger for one live integration event: an event a connected live source
 * sends, such as a PostHog project's own events or the Stripe and Shopify
 * app catalogs. The same event always returns the same trigger, across
 * reconnects of the same account. Brew owns its title and payload contract.
 * The provider starts sending the event once an automation using it is
 * published; saving a draft changes nothing upstream.
 *
 * Refusals: `404 INTEGRATION_EVENT_NOT_FOUND` for an unknown or other-brand
 * `eventId`; `404 NOT_FOUND` when the event left its source between the
 * read and the write; `409 INTEGRATION_RECONNECT_REQUIRED` when a catalog
 * event's trigger was removed with its connection (reconnect the
 * integration); `409 TRIGGER_LIMIT_REACHED` when the brand already holds the
 * most triggers it can (100).
 */
export function createEnsureIntegrationEventTrigger(client: HttpClient) {
  function ensureIntegrationEvent(
    input: EnsureIntegrationEventTriggerInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<EnsureIntegrationEventTriggerResponse>>
  function ensureIntegrationEvent(
    input: EnsureIntegrationEventTriggerInput,
    options?: RequestOptions
  ): Promise<EnsureIntegrationEventTriggerResponse>
  async function ensureIntegrationEvent(
    input: EnsureIntegrationEventTriggerInput,
    options?: RequestOptions
  ): Promise<
    | EnsureIntegrationEventTriggerResponse
    | BrewRawResponse<EnsureIntegrationEventTriggerResponse>
  > {
    const response =
      await client.request<EnsureIntegrationEventTriggerResponse>({
        method: 'POST',
        path: '/v1/automations/triggers/integration-events',
        body: input,
        ...(options ? { options } : {}),
      })
    return unwrapResponse(response, options)
  }
  return ensureIntegrationEvent
}
