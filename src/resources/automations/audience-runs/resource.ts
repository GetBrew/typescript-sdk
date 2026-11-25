import type { HttpClient } from '../../../core/http'

import { createCancelAudienceRun } from './cancel'
import { createGetAudienceRun } from './get'
import { createListAudienceRuns } from './list'
import { createPauseAudienceRun } from './pause'
import { createResumeAudienceRun } from './resume'

export type AudienceRunsResource = {
  readonly list: ReturnType<typeof createListAudienceRuns>
  readonly get: ReturnType<typeof createGetAudienceRun>
  readonly pause: ReturnType<typeof createPauseAudienceRun>
  readonly resume: ReturnType<typeof createResumeAudienceRun>
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
