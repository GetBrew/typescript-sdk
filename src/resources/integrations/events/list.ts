import { type HttpClient, unwrapResponse } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type {
  IntegrationEventsListResponse,
  ListIntegrationEventsQuery,
} from './types'

/**
 * Input to `brew.integrations.events.list(...)`:
 *
 * - `provider`: only this provider's events, e.g. `'posthog'`.
 * - `query`: search event names, titles and categories. Without it, each
 *   source's busiest events come first.
 * - `kind`: `custom`, `standard`, `action` (a saved provider action),
 *   `derived` (Brew computes it from another event) or `observed` (seen in
 *   deliveries only).
 * - `limit` (1–100, default 100) / `cursor`: page through the events.
 */
export type ListIntegrationEventsInput = Readonly<ListIntegrationEventsQuery>

export type ListIntegrationEventsResponse = IntegrationEventsListResponse

/**
 * `GET /v1/integrations/events` — the events the brand's connected live
 * sources offer as automation triggers, source by source, under
 * `{ data, sources, pagination }`. Brand-scoped (`X-Brand-Id` on an
 * organization credential). Read-only and free.
 *
 * Events a brand member hid, and internal traffic Brew suppressed, are left
 * out, so a page can hold fewer than `limit` rows: follow
 * `pagination.cursor` until `hasMore` is `false` to read every event.
 *
 * One event in full is `brew.integrations.events.get(eventId)`; its trigger
 * is `brew.automations.triggers.ensureIntegrationEvent({ eventId })`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ListIntegrationEventsResponse>` instead of the page.
 */
export function createListIntegrationEvents(client: HttpClient) {
  function listIntegrationEvents(
    input: ListIntegrationEventsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListIntegrationEventsResponse>>
  function listIntegrationEvents(
    input?: ListIntegrationEventsInput,
    options?: RequestOptions
  ): Promise<ListIntegrationEventsResponse>
  async function listIntegrationEvents(
    input: ListIntegrationEventsInput = {},
    options?: RequestOptions
  ): Promise<
    | ListIntegrationEventsResponse
    | BrewRawResponse<ListIntegrationEventsResponse>
  > {
    const response = await client.request<ListIntegrationEventsResponse>({
      method: 'GET',
      path: '/v1/integrations/events',
      query: {
        provider: input.provider,
        query: input.query,
        kind: input.kind,
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listIntegrationEvents
}
