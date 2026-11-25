import type { operations } from '../../generated/openapi-types'
import { autoPaginate, pageReadOptions } from '../../core/pagination'
import { BrewInputError } from '../../core/errors'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { EventRow, EventsAnalyticsResponse } from './types'

export type { EventsAnalyticsResponse }

export type EventsAnalyticsInput = Omit<
  NonNullable<operations['getEventsAnalytics']['parameters']['query']>,
  'groupBy' | 'bucket'
>

const COUNT_ONLY_KEYS = ['groupBy', 'bucket'] as const

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

export type EventsAnalyticsAllInput = Readonly<
  Omit<EventsAnalyticsInput, 'cursor'>
>

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
