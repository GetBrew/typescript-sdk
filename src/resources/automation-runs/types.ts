import type { components } from '../../generated/openapi-types'

/** A single automation run row (without per-node logs). */
export type AutomationRun = components['schemas']['AutomationRunRow']

/** One per-node execution log line on a run. */
export type AutomationRunLog = components['schemas']['AutomationRunLogRow']

/** Envelope returned by `GET /v1/analytics/automations/runs` (`{ data, pagination }`). */
export type AutomationRunsListResponse =
  components['schemas']['AutomationRunsListResponse']

/**
 * Bare run with its per-node `logs[]`, returned by
 * `GET /v1/analytics/automations/runs/{automationRunId}`.
 */
export type AutomationRunDetailResponse =
  components['schemas']['AutomationRunDetail']
