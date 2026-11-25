import type { HttpClient } from '../../core/http'

import {
  createIntegrationEventsResource,
  type IntegrationEventsResource,
} from './events/resource'
import { createListIntegrations } from './list'

export type IntegrationsResource = {
  readonly list: ReturnType<typeof createListIntegrations>
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
