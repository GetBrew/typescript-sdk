import type { HttpClient } from '../../core/http'

import { createCancelAutomationRun } from './cancel'
import {
  createFireTrigger,
  createPostAutomationRun,
  createReplayAutomationRun,
  createTestAutomation,
} from './create'
import {
  createGetAutomationRun,
  createListAutomationRuns,
} from './list'

export type AutomationRunsResource = {
  /** Raw `POST /v1/automation/runs` — body is a fire | test | replay union. */
  readonly create: ReturnType<typeof createPostAutomationRun>
  /** Sugar — fire a trigger. Returns `{ automationRunIds, triggerInstanceId, status }`. */
  readonly fire: ReturnType<typeof createFireTrigger>
  /** Sugar — test-fire a saved automation (mode: 'test'). */
  readonly test: ReturnType<typeof createTestAutomation>
  /** Sugar — replay a historical fire (P7 — currently 501). */
  readonly replay: ReturnType<typeof createReplayAutomationRun>
  /** `GET /v1/automation/runs` — list with filters. Returns `{ runs }`. */
  readonly list: ReturnType<typeof createListAutomationRuns>
  /** `GET /v1/automation/runs?automationRunId=…` — single-element `{ runs }` (+ optional `logs`). */
  readonly get: ReturnType<typeof createGetAutomationRun>
  /** `PATCH /v1/automation/runs` — cancel an in-flight run (P7 — currently 501). */
  readonly cancel: ReturnType<typeof createCancelAutomationRun>
}

export function createAutomationRunsResource(
  client: HttpClient
): AutomationRunsResource {
  const post = createPostAutomationRun(client)
  return {
    create: post,
    fire: createFireTrigger(post),
    test: createTestAutomation(post),
    replay: createReplayAutomationRun(post),
    list: createListAutomationRuns(client),
    get: createGetAutomationRun(client),
    cancel: createCancelAutomationRun(client),
  }
}
