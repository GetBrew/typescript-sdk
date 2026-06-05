import type { components, operations } from '../../generated/openapi-types'

/** Discriminated body for `POST /v1/sends` (campaign | test). */
export type SendsPostRequest = components['schemas']['SendsPostRequest']

/** 202 envelope for a queued/scheduled campaign send. */
export type SendAcceptedResponse = components['schemas']['SendsPostResponse']
export type SendAcceptedStatus = SendAcceptedResponse['status']

/** 200 envelope for a `mode: 'test'` send. */
export type SendsTestResponse = components['schemas']['SendsTestResponse']

/** Envelope returned by `GET /v1/sends`. */
export type SendsListResponse = components['schemas']['SendsListResponse']

/** A single campaign send row, with optional lifecycle `stats`. */
export type Send = SendsListResponse['sends'][number]

/** Aggregate delivery/engagement counters on a send. */
export type SendStats = NonNullable<Send['stats']>

/** Lifecycle status of a send. */
export type SendStatus = Send['status']

/** Query params accepted by `brew.sends.list(...)`. */
export type ListSendsInput = NonNullable<
  operations['listSends']['parameters']['query']
>
