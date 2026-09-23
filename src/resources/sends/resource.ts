import type { HttpClient } from '../../core/http'

import { createCancel } from './cancel'
import { createGetSend } from './get'
import { createListAllSends, createListSends } from './list'
import { createPause } from './pause'
import { createResume } from './resume'

export type SendsResource = {
  /** `GET /v1/sends` — every send the brand has made, newest first, with aggregate `stats` on each row. Filter by `kind`, `emailId`, the automation provenance ids, `status`, and the `from` / `to` window (scope: `sends`). */
  readonly list: ReturnType<typeof createListSends>
  /** Auto-pager over `list` — yields every matching `Send`. */
  readonly listAll: ReturnType<typeof createListAllSends>
  /** `GET /v1/sends/{sendId}` — one send as the bare row; `include: 'events'` inlines a bounded first page of per-recipient events (scope: `sends`). */
  readonly get: ReturnType<typeof createGetSend>
  /** `POST /v1/sends/{sendId}/cancel` — cancel a scheduled or queued send before it goes out; idempotent, returns `{ sendId, status: 'canceled' }` (scope: `sends`). */
  readonly cancel: ReturnType<typeof createCancel>
  /** `POST /v1/sends/{sendId}/pause` — pause an in-flight gradual send, halting the ramp without discarding it; reversible with `resume` (scope: `sends`). */
  readonly pause: ReturnType<typeof createPause>
  /** `POST /v1/sends/{sendId}/resume` — resume a paused gradual send, picking the ramp back up where it left off (scope: `sends`). */
  readonly resume: ReturnType<typeof createResume>
}

export function createSendsResource(client: HttpClient): SendsResource {
  return {
    list: createListSends(client),
    listAll: createListAllSends(client),
    get: createGetSend(client),
    cancel: createCancel(client),
    pause: createPause(client),
    resume: createResume(client),
  }
}
