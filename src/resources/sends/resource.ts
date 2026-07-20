import type { HttpClient } from '../../core/http'

import { createCancel } from './cancel'
import { createPause } from './pause'
import { createResume } from './resume'

export type SendsResource = {
  /** `POST /v1/sends/{sendId}/cancel` — cancel a scheduled or queued send before it goes out; idempotent, returns `{ sendId, status: 'canceled' }` (scope: `sends`). */
  readonly cancel: ReturnType<typeof createCancel>
  /** `POST /v1/sends/{sendId}/pause` — pause an in-flight gradual send, halting the ramp without discarding it; reversible with `resume` (scope: `sends`). */
  readonly pause: ReturnType<typeof createPause>
  /** `POST /v1/sends/{sendId}/resume` — resume a paused gradual send, picking the ramp back up where it left off (scope: `sends`). */
  readonly resume: ReturnType<typeof createResume>
}

export function createSendsResource(client: HttpClient): SendsResource {
  return {
    cancel: createCancel(client),
    pause: createPause(client),
    resume: createResume(client),
  }
}
