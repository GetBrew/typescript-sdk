import { type HttpClient, unwrapResponse } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { IntegrationsListResponse } from './types'

export type { IntegrationsListResponse }

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
