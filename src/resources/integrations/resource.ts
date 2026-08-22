import type { HttpClient } from '../../core/http'

import { createListIntegrations } from './list'

/**
 * The public shape of `brew.integrations`. Read-only: connecting a
 * provider is a human Settings hop, not an API call.
 */
export type IntegrationsResource = {
  /** `GET /v1/integrations` — the product integration catalog for the brand in scope, with a `connected` flag per provider. No permission scope. */
  readonly list: ReturnType<typeof createListIntegrations>
}

export function createIntegrationsResource(
  client: HttpClient
): IntegrationsResource {
  return {
    list: createListIntegrations(client),
  }
}
