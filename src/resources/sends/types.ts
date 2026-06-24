import type { components } from '../../generated/openapi-types'

/** Body for `POST /v1/sends` — start an async campaign send. */
export type SendsPostRequest = components['schemas']['SendsPostRequest']

/** 202 envelope for a queued/scheduled campaign send. */
export type SendAcceptedResponse = components['schemas']['SendsPostResponse']
export type SendAcceptedStatus = SendAcceptedResponse['status']

/** Body for `POST /v1/sends/test` — a one-off [TEST] delivery. */
export type SendsTestRequest = components['schemas']['SendsTestRequest']

/** 200 envelope for a `POST /v1/sends/test` delivery. */
export type SendsTestResponse = components['schemas']['SendsTestResponse']

/**
 * `{ data, pagination }` envelope returned by `GET /v1/analytics/sends`.
 * The send-read methods themselves live on `brew.analytics.sends.*`.
 */
export type SendsListResponse = components['schemas']['SendsListResponse']

/** A single campaign send row, with optional lifecycle `stats`. */
export type Send = components['schemas']['Send']

/** Aggregate delivery/engagement counters on a send. */
export type SendStats = NonNullable<Send['stats']>

/** Lifecycle status of a send. */
export type SendStatus = Send['status']
