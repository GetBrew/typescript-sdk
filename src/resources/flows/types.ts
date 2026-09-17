import type { components } from '../../generated/openapi-types'

/** Envelope returned by `GET /v1/flows` (`{ data, pagination? }`). */
export type FlowsListResponse = components['schemas']['FlowsListResponse']

/**
 * One public flow: a brand's real onboarding or newsletter sequence. List
 * rows are cards; the detail read (`slug`) also carries `anchor` and
 * `steps[]`.
 */
export type Flow = FlowsListResponse['data'][number]

/**
 * One email in a flow, in send order (present in detail mode). `emailId`
 * is the same `pt1_…` template reference `brew.templates.list()` returns,
 * so it round-trips into `referenceEmailId` on `brew.emails.generate(...)`.
 */
export type FlowStep = NonNullable<Flow['steps']>[number]
