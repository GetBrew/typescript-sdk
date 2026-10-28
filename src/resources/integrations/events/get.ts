import { type HttpClient, unwrapResponse } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { IntegrationEventDetail } from './types'

/** `GET /v1/integrations/events/{eventId}` returns the bare event. */
export type GetIntegrationEventResponse = IntegrationEventDetail

/**
 * `GET /v1/integrations/events/{eventId}` — one live integration event in
 * full: each property with its template `variable` (`properties.<key>` or
 * `person.<key>` for a tenant catalog's event, the key itself for a static
 * catalog's), which hold personal data, which Brew suggests for
 * personalization, its lifecycle stage and its roles in the product model.
 * Brand-scoped. No permission scope. Read-only and free.
 *
 * Pass an `eventId` from `brew.integrations.events.list()`; never compose
 * one. An unknown or other-brand id throws a `BrewApiError` with
 * `status: 404` and `code: 'INTEGRATION_EVENT_NOT_FOUND'`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetIntegrationEventResponse>` instead of the event.
 */
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
