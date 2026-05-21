/**
 * Back-compat `brew.events.fire(...)` alias for the automation-runs
 * resource. Forwards to `brew.automationRuns.fire(...)` — the
 * canonical shape post-flattening.
 *
 * The HTTP path that backs this method is now `POST
 * /v1/automation/runs` (not `/v1/events`). The old `/v1/events` and
 * `/v1/executions` routes still work as deprecated aliases on the
 * server side; SDK consumers should migrate to
 * `brew.automationRuns.fire(...)` for the same shape.
 */
import type { HttpClient } from '../../core/http'

import {
  createFireTrigger,
  createPostAutomationRun,
} from '../automation-runs/create'

export type EventsResource = {
  /**
   * @deprecated Use `brew.automationRuns.fire(...)` instead. Same
   * shape; targets `POST /v1/automation/runs` under the hood.
   */
  readonly fire: ReturnType<typeof createFireTrigger>
}

export function createEventsResource(client: HttpClient): EventsResource {
  const post = createPostAutomationRun(client)
  return {
    fire: createFireTrigger(post),
  }
}
