import { type HttpClient, unwrapResponse } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { IntegrationEventDetail } from './types'

export type GetIntegrationEventResponse = IntegrationEventDetail

export function createGetIntegrationEvent(client: HttpClient) {
  function getIntegrationEvent(
    eventId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetIntegrationEventResponse>>
  function getIntegrationEvent(
    eventId: string,
    options?: RequestOptions
  ): Promise<GetIntegrationEventResponse>
  async function getIntegrationEvent(
    eventId: string,
    options?: RequestOptions
  ): Promise<
    GetIntegrationEventResponse | BrewRawResponse<GetIntegrationEventResponse>
  > {
    const response = await client.request<GetIntegrationEventResponse>({
      method: 'GET',
      path: `/v1/integrations/events/${encodeURIComponent(eventId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getIntegrationEvent
}
