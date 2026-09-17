import type { operations } from '../../generated/openapi-types'
import { autoPaginate } from '../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { EventRow, EventsAnalyticsResponse } from './types'

export type { EventsAnalyticsResponse }

/** Query params accepted by `brew.analytics.events(...)`. */
export type EventsAnalyticsInput = NonNullable<
  operations['getEventsAnalytics']['parameters']['query']
>

/**
 * `GET /v1/analytics/events` — the unified event explorer across email,
 * automation, trigger, and inbound domains. Requires the `emails` scope.
 *
 * Filters: `from`/`to` (ISO; default last 7d), `recipient` (renamed
 * from `recipientEmail` in v1), `eventType`, `domain`, `source`,
 * `messageClass`, `automationId`, `automationRunId`, `triggerEventId`,
 * `audienceId`, `emailId`, `sendId`, the `includeMachineClicks` /
 * `includeMachineOpens` bot toggles, plus `limit`/`cursor`. Returns
 * `{ data, pagination, range }`.
 *
 * Per-contact engagement is just `{ recipient }`. To page through the
 * whole feed use `brew.analytics.eventsAll`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<EventsAnalyticsResponse>` instead of the unwrapped
 * envelope.
 */
export function createEventsAnalytics(client: HttpClient) {
  function eventsAnalytics(
    input: EventsAnalyticsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<EventsAnalyticsResponse>>
  function eventsAnalytics(
    input?: EventsAnalyticsInput,
    options?: RequestOptions
  ): Promise<EventsAnalyticsResponse>
  async function eventsAnalytics(
    input: EventsAnalyticsInput = {},
    options?: RequestOptions
  ): Promise<
    EventsAnalyticsResponse | BrewRawResponse<EventsAnalyticsResponse>
  > {
    const response = await client.request<EventsAnalyticsResponse>({
      method: 'GET',
      path: '/v1/analytics/events',
      query: {
        from: input.from,
        to: input.to,
        recipient: input.recipient,
        eventType: input.eventType,
        domain: input.domain,
        source: input.source,
        messageClass: input.messageClass,
        automationId: input.automationId,
        automationRunId: input.automationRunId,
        triggerEventId: input.triggerEventId,
        audienceId: input.audienceId,
        emailId: input.emailId,
        sendId: input.sendId,
        includeMachineClicks: input.includeMachineClicks,
        includeMachineOpens: input.includeMachineOpens,
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return eventsAnalytics
}

/**
 * Input to `brew.analytics.eventsAll(...)`. Same filters as `events`
 * minus `cursor` — the iterator owns cursor state.
 */
export type EventsAnalyticsAllInput = Readonly<
  Omit<EventsAnalyticsInput, 'cursor'>
>

/**
 * Async iterator that pages through the entire event feed, yielding one
 * `EventRow` at a time. Ideal for exporting a contact's full engagement
 * timeline (`{ recipient }`).
 */
export function createEventsAnalyticsAll(client: HttpClient) {
  const events = createEventsAnalytics(client)

  return function eventsAnalyticsAll(
    input: EventsAnalyticsAllInput = {},
    options?: RequestOptions
  ): AsyncGenerator<EventRow, void, void> {
    return autoPaginate<EventRow>(
      async (cursor) => {
        const pageInput: EventsAnalyticsInput = {
          ...input,
          ...(cursor !== null ? { cursor } : {}),
        }
        const response = await events(pageInput, options)
        return { items: response.data, pagination: response.pagination }
      },
      options?.signal ? { signal: options.signal } : undefined
    )
  }
}
