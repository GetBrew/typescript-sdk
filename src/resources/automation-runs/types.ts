import type { components } from '../../generated/openapi-types'

export type AutomationRun = components['schemas']['AutomationRunRow']
export type AutomationRunLog = components['schemas']['AutomationRunLogRow']
export type AutomationRunsListResponse =
  components['schemas']['AutomationRunsListResponse']
export type AutomationRunsPostResponse =
  components['schemas']['AutomationRunsPostResponse']

/**
 * Fire-branch response — the rich envelope. Read the started run ids
 * from `details.automationRunIds` (a fire can match N automations).
 */
export type FireTriggerResponse = Extract<
  AutomationRunsPostResponse,
  { success: boolean }
>

/**
 * Test / replay-branch response — the flat envelope with top-level
 * `automationRunIds`.
 */
export type TestRunResponse = Exclude<
  AutomationRunsPostResponse,
  { success: boolean }
>
