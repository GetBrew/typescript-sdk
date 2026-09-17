import type { components, operations } from '../../generated/openapi-types'

/** `{ data, pagination }` envelope returned by `GET /v1/sends`. */
export type SendsListResponse = components['schemas']['SendsListResponse']

/**
 * A single campaign / automation send row. Automation sends carry the
 * provenance chain that produced them — `automationId`, `nodeId`,
 * `automationRunId`, `audienceRunId`, `triggerInstanceId` — so a row can
 * be traced back to the fire that started it. `GET /v1/sends/{sendId}`
 * with `include: 'events'` also attaches a bounded first page of
 * per-recipient `events[]`.
 */
export type Send = components['schemas']['Send']

/** Aggregate delivery/engagement counters on a send. */
export type SendStats = NonNullable<Send['stats']>

/**
 * Lifecycle status of a send, from the one v1 status vocabulary:
 * `scheduled | queued | running | paused | completed |
 * partially_completed | failed | canceled`.
 */
export type SendStatus = Send['status']

/** A single per-recipient analytics event attributed to a send. */
export type SendEvent = components['schemas']['SendEvent']

/** Query params accepted by `brew.sends.list(...)`. */
export type ListSendsInput = NonNullable<
  operations['listSends']['parameters']['query']
>
