import type { HttpClient } from '../../../core/http'

import { createCancelAudienceRun } from './cancel'
import { createGetAudienceRun } from './get'
import { createListAudienceRuns } from './list'
import { createPauseAudienceRun } from './pause'
import { createResumeAudienceRun } from './resume'

export type AudienceRunsResource = {
  /** `GET /v1/automations/audience-runs` — manual-audience run history, newest first; filter with `automationId` / `status` (scope: `automations`). */
  readonly list: ReturnType<typeof createListAudienceRuns>
  /** `GET /v1/automations/audience-runs/{audienceRunId}` — one run as the bare row (scope: `automations`). */
  readonly get: ReturnType<typeof createGetAudienceRun>
  /** `POST /v1/automations/audience-runs/{audienceRunId}/pause` — the reversible stop on an in-flight run (scope: `automations`). */
  readonly pause: ReturnType<typeof createPauseAudienceRun>
  /** `POST /v1/automations/audience-runs/{audienceRunId}/resume` — pick a paused or failed run back up where it left off (scope: `automations`). */
  readonly resume: ReturnType<typeof createResumeAudienceRun>
  /** `POST /v1/automations/audience-runs/{audienceRunId}/cancel` — permanently end a run; nothing further is sent (scope: `automations`). */
  readonly cancel: ReturnType<typeof createCancelAudienceRun>
}

export function createAudienceRunsResource(
  client: HttpClient
): AudienceRunsResource {
  return {
    list: createListAudienceRuns(client),
    get: createGetAudienceRun(client),
    pause: createPauseAudienceRun(client),
    resume: createResumeAudienceRun(client),
    cancel: createCancelAudienceRun(client),
  }
}
