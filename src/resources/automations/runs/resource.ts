import type { HttpClient } from '../../../core/http'

import { createGetAutomationRun, createListAutomationRuns } from './list'

export type AutomationRunsResource = {
  /** `GET /v1/automations/runs` — list runs under `{ data, pagination }` (scope: `automations`). */
  readonly list: ReturnType<typeof createListAutomationRuns>
  /** `GET /v1/automations/runs/{automationRunId}` — one run with per-node `logs[]` (scope: `automations`). */
  readonly get: ReturnType<typeof createGetAutomationRun>
}

export function createAutomationRunsResource(
  client: HttpClient
): AutomationRunsResource {
  return {
    list: createListAutomationRuns(client),
    get: createGetAutomationRun(client),
  }
}
