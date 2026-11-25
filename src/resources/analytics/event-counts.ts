import type { components, operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export const EVENTS_GROUP_BY_TOKENS = [
  'eventType',
  'emailId',
  'automationId',
  'sendId',
  'source',
  'link',
  'recipientDomain',
  'unsubscribeReason',
] as const

type EventsQuery = NonNullable<
  operations['getEventsAnalytics']['parameters']['query']
>
type GroupByField = (typeof EVENTS_GROUP_BY_TOKENS)[number]
type GroupBy = readonly [GroupByField] | readonly [GroupByField, GroupByField]
type Bucket = NonNullable<EventsQuery['bucket']>

export type EventCountsInput = Omit<
  EventsQuery,
  'groupBy' | 'bucket' | 'cursor' | 'limit' | 'automationRunId'
> &
  (
    | { readonly groupBy: GroupBy; readonly bucket?: Bucket }
    | { readonly groupBy?: GroupBy; readonly bucket: Bucket }
  )

export type EventCountsResponse =
  components['schemas']['EventsBreakdownResponse']

export function createEventCounts(client: HttpClient) {
  function eventCounts(
    input: EventCountsInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<EventCountsResponse>>
  function eventCounts(
    input: EventCountsInput,
    options?: RequestOptions
  ): Promise<EventCountsResponse>
  async function eventCounts(
    input: EventCountsInput,
    options?: RequestOptions
  ): Promise<EventCountsResponse | BrewRawResponse<EventCountsResponse>> {
    const response = await client.request<EventCountsResponse>({
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
        triggerEventId: input.triggerEventId,
        audienceId: input.audienceId,
        emailId: input.emailId,
        sendId: input.sendId,
        includeMachineClicks: input.includeMachineClicks,
        includeMachineOpens: input.includeMachineOpens,
        groupBy: input.groupBy?.join(','),
        bucket: input.bucket,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return eventCounts
}
