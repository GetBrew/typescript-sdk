import type { HttpClient } from '../../../core/http'

import { createListAutomationRuns } from './list'

export type AutomationRunsResource = {
  /** `GET /v1/automations/runs` — the single run read. List runs (omit `automationRunId`), or fetch one (`automationRunId` → single-row page; `include: 'logs'` for per-node `logs[]`) (scope: `automations`). */
  readonly list: ReturnType<typeof createListAutomationRuns>
}

export function createAutomationRunsResource(
  client: HttpClient
): AutomationRunsResource {
  return {
    list: createListAutomationRuns(client),
  }
}
