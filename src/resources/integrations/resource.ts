import type { HttpClient } from '../../core/http'

import { createConnectIntegration } from './connect'
import { createGetIntegrationConnection } from './get-connection'
import { createListIntegrations } from './list'

/**
 * The public shape of `brew.integrations`. Connecting a catalog provider
 * is a human Settings hop; the hosted auth email hooks (`supabase_auth`,
 * `clerk`) also connect over the API, from a setup script or the CLI.
 */
export type IntegrationsResource = {
  /** `GET /v1/integrations` — the product integration catalog for the brand in scope, with a `connected` flag per provider. No permission scope. */
  readonly list: ReturnType<typeof createListIntegrations>
  /**
   * `PUT /v1/integrations/{provider}/connection` — connect a hosted auth
   * email hook (`supabase_auth`, `clerk`) with its `signingSecret` and set
   * up its auth app emails; returns the `webhookUrl` to paste into the
   * provider (scopes: `emails` and `automations`).
   */
  readonly connect: ReturnType<typeof createConnectIntegration>
  /** `GET /v1/integrations/{provider}/connection` — the brand's hosted auth hook connection (`connectionId`, `webhookUrl`, `status`); `404 NOT_FOUND` when not connected. No permission scope. */
  readonly getConnection: ReturnType<typeof createGetIntegrationConnection>
}

export function createIntegrationsResource(
  client: HttpClient
): IntegrationsResource {
  return {
    list: createListIntegrations(client),
    connect: createConnectIntegration(client),
    getConnection: createGetIntegrationConnection(client),
  }
}
