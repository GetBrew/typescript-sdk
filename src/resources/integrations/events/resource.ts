import type { HttpClient } from '../../../core/http'

import { createGetIntegrationEvent } from './get'
import { createListIntegrationEvents } from './list'

/**
 * The public shape of `brew.integrations.events`: the events a brand's
 * connected live sources offer as automation triggers. Read-only; the
 * trigger for one is `brew.automations.triggers.ensureIntegrationEvent`.
 */
export type IntegrationEventsResource = {
  /** `GET /v1/integrations/events` — the brand's live integration events, source by source, busiest first or by `query`; filter by `provider` and `kind`. */
  readonly list: ReturnType<typeof createListIntegrationEvents>
  /** `GET /v1/integrations/events/{eventId}` — one event in full, each property with its template `variable`; `404 INTEGRATION_EVENT_NOT_FOUND` for an unknown or other-brand id. */
  readonly get: ReturnType<typeof createGetIntegrationEvent>
}

export function createIntegrationEventsResource(
  client: HttpClient
): IntegrationEventsResource {
  return {
    list: createListIntegrationEvents(client),
    get: createGetIntegrationEvent(client),
  }
}
