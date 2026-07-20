import type { HttpClient } from '../../../core/http'

import { createControlAudienceRun } from './control'
import { createListAudienceRuns } from './list'

export type AudienceRunsResource = {
  /** `GET /v1/automations/audience-runs` — list or fetch one manual-audience run. */
  readonly list: ReturnType<typeof createListAudienceRuns>
  /** `POST /v1/automations/audience-runs/{audienceRunId}/control` — pause, resume, or cancel. */
  readonly control: ReturnType<typeof createControlAudienceRun>
}

export function createAudienceRunsResource(
  client: HttpClient
): AudienceRunsResource {
  return {
    list: createListAudienceRuns(client),
    control: createControlAudienceRun(client),
  }
}
