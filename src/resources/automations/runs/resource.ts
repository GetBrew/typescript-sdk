import type { HttpClient } from '../../../core/http'

import { createCancelAutomationRun } from './cancel'
import { createGetAutomationRun } from './get'
import { createListAutomationRuns } from './list'

export type AutomationRunsResource = {
  /** `GET /v1/automations/runs` — recent runs, newest first; filter by automation, trigger, `status`, `mode`, and the `from` / `to` window (scope: `automations`). */
  readonly list: ReturnType<typeof createListAutomationRuns>
  /** `GET /v1/automations/runs/{automationRunId}` — one run as the bare row; `include: 'logs'` attaches the per-node execution log (scope: `automations`). */
  readonly get: ReturnType<typeof createGetAutomationRun>
  /** `POST /v1/automations/runs/{automationRunId}/cancel` — cancel ONE in-flight run; irreversible, nothing further is sent (scope: `automations`). */
  readonly cancel: ReturnType<typeof createCancelAutomationRun>
}

export function createAutomationRunsResource(
  client: HttpClient
): AutomationRunsResource {
  return {
    list: createListAutomationRuns(client),
    get: createGetAutomationRun(client),
    cancel: createCancelAutomationRun(client),
  }
}
