import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { IntegrationsGetResponse, ListIntegrationsInput } from './types'

export type { IntegrationsGetResponse, ListIntegrationsInput }

/**
 * `GET /v1/integrations` — the triggerable integration-event catalog
 * for the brand. Requires the `automations` scope.
 *
 * Returns the uniform `{ data, pagination }` envelope, one `data[]` entry
 * per provider. The catalog lists EVERY triggerable event even when the
 * provider is not connected, so an agent can discover what is possible:
 * - `connected` — an active integration connection exists for the brand.
 * - each event's `provisioned` — a Brew trigger for that event already
 *   exists on the brand.
 *
 * Pass `{ provider }` to scope to one provider. An unknown provider is a
 * `400 INVALID_REQUEST`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<IntegrationsGetResponse>` instead of the unwrapped
 * payload.
 */
export function createListIntegrations(client: HttpClient) {
  function listIntegrations(
    input: ListIntegrationsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<IntegrationsGetResponse>>
  function listIntegrations(
    input?: ListIntegrationsInput,
    options?: RequestOptions
  ): Promise<IntegrationsGetResponse>
  async function listIntegrations(
    input: ListIntegrationsInput = {},
    options?: RequestOptions
  ): Promise<
    IntegrationsGetResponse | BrewRawResponse<IntegrationsGetResponse>
  > {
    const response = await client.request<IntegrationsGetResponse>({
      method: 'GET',
      path: '/v1/integrations',
      query: { provider: input.provider },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listIntegrations
}
