import type { HttpClient } from '../../core/http'

import {
  createIntegrationEventsResource,
  type IntegrationEventsResource,
} from './events/resource'
import { createListIntegrations } from './list'

/**
 * The public shape of `brew.integrations`. Read-only: connecting a
 * provider is a human Settings hop, not an API call.
 */
export type IntegrationsResource = {
  /** `GET /v1/integrations` — the product integration catalog for the brand in scope, with a `connected` flag per provider. No permission scope. */
  readonly list: ReturnType<typeof createListIntegrations>
  /** `/v1/integrations/events(/{eventId})` — the events the brand's connected live sources offer as automation triggers: `list` and `get` (scope: `automations`). */
  readonly events: IntegrationEventsResource
}

export function createIntegrationsResource(
  client: HttpClient
): IntegrationsResource {
  return {
    list: createListIntegrations(client),
    events: createIntegrationEventsResource(client),
  }
}
