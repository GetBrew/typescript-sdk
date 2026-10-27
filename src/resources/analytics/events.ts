import type { operations } from '../../generated/openapi-types'
import { autoPaginate, pageReadOptions } from '../../core/pagination'
import { BrewInputError } from '../../core/errors'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { EventRow, EventsAnalyticsResponse } from './types'

export type { EventsAnalyticsResponse }

/**
 * Query params accepted by `brew.analytics.events(...)`. The route's
 * `groupBy` and `bucket` return counts instead of rows; they belong to
 * `brew.analytics.eventCounts`.
 */
export type EventsAnalyticsInput = Omit<
  NonNullable<operations['getEventsAnalytics']['parameters']['query']>,
  'groupBy' | 'bucket'
>

/**
 * Keys the route takes for a grouped count. This row read does not send
 * them, so it refuses them (from untyped or cast input) rather than
 * returning rows to a caller who asked for counts.
 */
const COUNT_ONLY_KEYS = ['groupBy', 'bucket'] as const

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
 * whole feed use `brew.analytics.eventsAll`. For grouped counts
 * (`groupBy` / `bucket`) use `brew.analytics.eventCounts`; passing either
 * here throws `BrewInputError` before any request.
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
    for (const key of COUNT_ONLY_KEYS) {
      if ((input as Record<string, unknown>)[key] !== undefined) {
        throw new BrewInputError({
          param: key,
          message: `\`${key}\` counts events instead of listing them; call brew.analytics.eventCounts (its \`groupBy\` is a field list, e.g. \`['eventType']\`).`,
        })
      }
    }
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
        const response = await events(pageInput, pageReadOptions({ options }))
        return { items: response.data, pagination: response.pagination }
      },
      options?.signal ? { signal: options.signal } : undefined
    )
  }
}
