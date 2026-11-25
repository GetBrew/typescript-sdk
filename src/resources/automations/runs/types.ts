import type { components, operations } from '../../../generated/openapi-types'

export type AutomationRunsListResponse =
  components['schemas']['AutomationRunsListResponse']

export type AutomationRun = components['schemas']['AutomationRun']

export type AutomationRunCancelResponse =
  components['schemas']['AutomationRunCancelResponse']

export type AutomationRunCancelRequest =
  components['schemas']['AutomationRunCancelRequest']

export type AutomationRunLog = NonNullable<AutomationRun['logs']>[number]

export type ListAutomationRunsInput = NonNullable<
  operations['listAutomationRuns']['parameters']['query']
>
