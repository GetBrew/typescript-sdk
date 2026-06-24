import type { components, operations } from '../../../generated/openapi-types'

/** `{ data, pagination? }` envelope returned by `GET /v1/analytics/sends`. */
export type SendsListResponse = components['schemas']['SendsListResponse']

/**
 * A single campaign / automation send row, with optional lifecycle
 * `stats`. In detail mode (`?sendId=` with `include: 'events'`) it also
 * carries a bounded first page of `events[]`.
 */
export type Send = components['schemas']['Send']

/** Aggregate delivery/engagement counters on a send. */
export type SendStats = NonNullable<Send['stats']>

/** Lifecycle status of a send. */
export type SendStatus = Send['status']

/** A single per-recipient analytics event attributed to a send. */
export type SendEvent = components['schemas']['SendEvent']

/** Query params accepted by `brew.analytics.sends.list(...)`. */
export type ListSendsInput = NonNullable<
  operations['listSends']['parameters']['query']
>
