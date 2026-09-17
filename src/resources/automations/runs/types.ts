import type { components, operations } from '../../../generated/openapi-types'

/** `{ data, pagination }` envelope returned by `GET /v1/automations/runs`. */
export type AutomationRunsListResponse =
  components['schemas']['AutomationRunsListResponse']

/**
 * A single automation run row. Lean by default; the detail read
 * (`runs.get(automationRunId, { include: 'logs' })`) also carries the
 * per-node `logs[]`.
 */
export type AutomationRun = components['schemas']['AutomationRun']

/** Body returned by `POST /v1/automations/runs/{automationRunId}/cancel`. */
export type AutomationRunCancelResponse =
  components['schemas']['AutomationRunCancelResponse']

/** Optional operator note sent with a cancel. */
export type AutomationRunCancelRequest =
  components['schemas']['AutomationRunCancelRequest']

/**
 * One per-node execution log line on a run (present when
 * `include: 'logs'`). A node reports `running | completed | failed |
 * skipped`.
 */
export type AutomationRunLog = NonNullable<AutomationRun['logs']>[number]

/** Query params accepted by `brew.automations.runs.list(...)`. */
export type ListAutomationRunsInput = NonNullable<
  operations['listAutomationRuns']['parameters']['query']
>
