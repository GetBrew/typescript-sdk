import type { HttpClient } from '../../../core/http'

import { createCancelAutomationRun } from './cancel'
import { createGetAutomationRun } from './get'
import { createListAutomationRuns } from './list'

export type AutomationRunsResource = {
  readonly list: ReturnType<typeof createListAutomationRuns>
  readonly get: ReturnType<typeof createGetAutomationRun>
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
