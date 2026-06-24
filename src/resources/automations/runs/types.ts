import type { components } from '../../../generated/openapi-types'

/** Envelope returned by `GET /v1/automations/runs` (`{ data, pagination? }`). */
export type AutomationRunsListResponse =
  components['schemas']['AutomationRunsListResponse']

/**
 * A single automation run row. Lean by default; in detail mode
 * (`?automationRunId=` with `include: 'logs'`) it also carries the
 * per-node `logs[]`.
 */
export type AutomationRun = AutomationRunsListResponse['data'][number]

/** One per-node execution log line on a run (present when `include: 'logs'`). */
export type AutomationRunLog = NonNullable<AutomationRun['logs']>[number]
