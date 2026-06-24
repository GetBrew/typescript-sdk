import type { components, operations } from '../../../generated/openapi-types'

/** `{ data, pagination }` envelope returned by `GET /v1/analytics/sends`. */
export type SendsListResponse = components['schemas']['SendsListResponse']

/** A single campaign send row, with optional lifecycle `stats`. */
export type Send = components['schemas']['Send']

/** Aggregate delivery/engagement counters on a send. */
export type SendStats = NonNullable<Send['stats']>

/** Lifecycle status of a send. */
export type SendStatus = Send['status']

/** `{ data, pagination }` envelope returned by `GET /v1/analytics/sends/{sendId}/events`. */
export type SendEventsResponse = components['schemas']['SendEventsResponse']

/** A single per-recipient analytics event attributed to a send. */
export type SendEvent = components['schemas']['SendEvent']

/** Query params accepted by `brew.analytics.sends.list(...)`. */
export type ListSendsInput = NonNullable<
  operations['listSends']['parameters']['query']
>

/** Query params accepted by `brew.analytics.sends.listForEmail(...)`. */
export type ListEmailSendsInput = NonNullable<
  operations['listEmailSends']['parameters']['query']
>

/** Query params accepted by `brew.analytics.sends.listEvents(...)`. */
export type ListSendEventsInput = NonNullable<
  operations['listSendEvents']['parameters']['query']
>
