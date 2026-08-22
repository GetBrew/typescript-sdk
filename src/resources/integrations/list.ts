import { type HttpClient, unwrapResponse } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { IntegrationsListResponse } from './types'

export type { IntegrationsListResponse }

/**
 * `GET /v1/integrations` — the product integration catalog for the
 * brand in scope, with a `connected` flag per provider. Brand-scoped
 * (`X-Brand-Id` on an organization credential). No permission scope.
 *
 * Connecting a provider is a human Settings hop at
 * `/integrations/{provider}` — never construct or paste a connect URL
 * into model output.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<IntegrationsListResponse>` instead of the unwrapped
 * payload.
 */
export function createListIntegrations(client: HttpClient) {
  function listIntegrations(
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<IntegrationsListResponse>>
  function listIntegrations(
    options?: RequestOptions
  ): Promise<IntegrationsListResponse>
  async function listIntegrations(
    options?: RequestOptions
  ): Promise<
    IntegrationsListResponse | BrewRawResponse<IntegrationsListResponse>
  > {
    const response = await client.request<IntegrationsListResponse>({
      method: 'GET',
      path: '/v1/integrations',
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listIntegrations
}
