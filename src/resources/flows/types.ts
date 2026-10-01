import type { components } from '../../generated/openapi-types'

/**
 * Envelope returned by `GET /v1/flows`: `{ data, pagination, total,
 * isTotalExact }`. `total` counts every flow the query matches across all
 * pages (filters narrow it, `semantic` only orders it); it is a floor when
 * `isTotalExact` is `false` — the read was cut at 500 flows.
 */
export type FlowsListResponse = components['schemas']['FlowsListResponse']

/**
 * One public flow: a brand's real onboarding or newsletter sequence. List
 * rows are cards; `brew.flows.get(slug)` returns the same row with `anchor`
 * and `steps[]`.
 */
export type Flow = FlowsListResponse['data'][number]

/**
 * One email in a flow, in send order (present on `brew.flows.get`). `emailId`
 * is the same `pt1_…` template reference `brew.templates.list()` returns,
 * so it round-trips into `referenceEmailId` on `brew.emails.generate(...)`.
 */
export type FlowStep = NonNullable<Flow['steps']>[number]
