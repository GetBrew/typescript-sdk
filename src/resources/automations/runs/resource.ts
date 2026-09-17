import type { HttpClient } from '../../../core/http'

import { createCancelAutomationRun } from './cancel'
import { createListAutomationRuns } from './list'

export type AutomationRunsResource = {
  /** `GET /v1/automations/runs` — the single run read. List runs (omit `automationRunId`), or fetch one (`automationRunId` → single-row page; `include: 'logs'` for per-node `logs[]`) (scope: `automations`). */
  readonly list: ReturnType<typeof createListAutomationRuns>
  /** `PATCH /v1/automations/runs` — cancel ONE run by `automationRunId` (event execution or test run); irreversible, nothing further is sent (scope: `automations`). */
  readonly cancel: ReturnType<typeof createCancelAutomationRun>
}

export function createAutomationRunsResource(
  client: HttpClient
): AutomationRunsResource {
  return {
    list: createListAutomationRuns(client),
    cancel: createCancelAutomationRun(client),
  }
}
