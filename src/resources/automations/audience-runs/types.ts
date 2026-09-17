import type { components, operations } from '../../../generated/openapi-types'

/** `{ data, pagination }` envelope returned by `GET /v1/automations/audience-runs`. */
export type AudienceRunsListResponse =
  components['schemas']['AudienceRunsListResponse']

/**
 * A single manual-audience run row: lifecycle `status` from the one v1
 * vocabulary, per-node `nodeStats`, and the `gradualSend` ramp when the
 * launch used one.
 */
export type AudienceRun = components['schemas']['AudienceRun']

/**
 * Body returned by the three audience-run lifecycle actions
 * (`pause` / `resume` / `cancel`) — `{ audienceRunId, status }`, plus
 * `resumedFrom` on a resume.
 */
export type AudienceRunActionResponse =
  components['schemas']['AudienceRunActionResponse']

/** Query params accepted by `brew.automations.audienceRuns.list(...)`. */
export type ListAudienceRunsInput = NonNullable<
  operations['listAudienceRuns']['parameters']['query']
>
