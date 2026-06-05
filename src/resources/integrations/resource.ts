import type { HttpClient } from '../../core/http'

import { createListIntegrations } from './list'

export type IntegrationsResource = {
  /** `GET /v1/integrations` — triggerable integration-event catalog (scope: `automations`). */
  readonly list: ReturnType<typeof createListIntegrations>
}

export function createIntegrationsResource(
  client: HttpClient
): IntegrationsResource {
  return {
    list: createListIntegrations(client),
  }
}
