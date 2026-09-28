import type { components, operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/**
 * The fields `brew.analytics.eventCounts` can group by. Pinned to the spec's
 * `x-brew-group-by-tokens` by `tests/openapi-surface-parity.test.ts`.
 */
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
/** One or two fields; the API refuses an empty list or a third field. */
type GroupBy = readonly [GroupByField] | readonly [GroupByField, GroupByField]
type Bucket = NonNullable<EventsQuery['bucket']>

/**
 * Input to `brew.analytics.eventCounts`: the events read's filters plus at
 * least one of `groupBy` (one or two fields) and `bucket` (`day` | `week` |
 * `month`, UTC, Monday weeks). A grouped count takes no page: no `cursor`,
 * `limit` or `automationRunId`.
 */
export type EventCountsInput = Omit<
  EventsQuery,
  'groupBy' | 'bucket' | 'cursor' | 'limit' | 'automationRunId'
> &
  (
    | { readonly groupBy: GroupBy; readonly bucket?: Bucket }
    | { readonly groupBy?: GroupBy; readonly bucket: Bucket }
  )

/**
 * The total `count`, the largest 200 `groups` (`key` maps each grouped field
 * to its value; `bucket` is the ISO period start) and `otherCount` for the
 * rest. `truncated: true` with `coveredFrom` when the window held more than
 * the newest 20,000 events.
 */
export type EventCountsResponse =
  components['schemas']['EventsBreakdownResponse']

/**
 * `GET /v1/analytics/events` with `groupBy` / `bucket` (scope: `emails`) —
 * counts of the email events the same filters list: events per type per
 * day, clicks per link (`groupBy: ['link']` with `eventType: 'clicked'`),
 * unsubscribes per stated reason. Counts EVENTS, not unique recipients.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<EventCountsResponse>` instead of the unwrapped envelope.
 */
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
