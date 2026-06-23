import type { components, operations } from '../../generated/openapi-types'

/** Body for `POST /v1/sends` — start an async campaign send. */
export type SendsPostRequest = components['schemas']['SendsPostRequest']

/** 202 envelope for a queued/scheduled campaign send. */
export type SendAcceptedResponse = components['schemas']['SendsPostResponse']
export type SendAcceptedStatus = SendAcceptedResponse['status']

/** Body for `POST /v1/sends/test` — a one-off [TEST] delivery. */
export type SendsTestRequest = components['schemas']['SendsTestRequest']

/** 200 envelope for a `POST /v1/sends/test` delivery. */
export type SendsTestResponse = components['schemas']['SendsTestResponse']

/** `{ data, pagination }` envelope returned by `GET /v1/sends`. */
export type SendsListResponse = components['schemas']['SendsListResponse']

/** A single campaign send row, with optional lifecycle `stats`. */
export type Send = components['schemas']['Send']

/** Aggregate delivery/engagement counters on a send. */
export type SendStats = NonNullable<Send['stats']>

/** Lifecycle status of a send. */
export type SendStatus = Send['status']

/** `{ data, pagination }` envelope returned by `GET /v1/sends/{sendId}/events`. */
export type SendEventsResponse = components['schemas']['SendEventsResponse']

/** A single per-recipient analytics event attributed to a send. */
export type SendEvent = components['schemas']['SendEvent']

/** Query params accepted by `brew.sends.list(...)`. */
export type ListSendsInput = NonNullable<
  operations['listSends']['parameters']['query']
>

/** Query params accepted by `brew.sends.listForEmail(...)`. */
export type ListEmailSendsInput = NonNullable<
  operations['listEmailSends']['parameters']['query']
>

/** Query params accepted by `brew.sends.listEvents(...)`. */
export type ListSendEventsInput = NonNullable<
  operations['listSendEvents']['parameters']['query']
>
