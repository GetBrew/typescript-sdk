import type { HttpClient } from '../../../core/http'

import { createGetIntegrationEvent } from './get'
import { createListIntegrationEvents } from './list'

export type IntegrationEventsResource = {
  readonly list: ReturnType<typeof createListIntegrationEvents>
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
