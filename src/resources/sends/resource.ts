import type { HttpClient } from '../../core/http'

import { createCancel } from './cancel'

export type SendsResource = {
  /** `POST /v1/sends/{sendId}/cancel` — cancel a scheduled or queued send before it goes out; idempotent, returns `{ sendId, status: 'canceled' }` (scope: `sends`). */
  readonly cancel: ReturnType<typeof createCancel>
}

export function createSendsResource(client: HttpClient): SendsResource {
  return {
    cancel: createCancel(client),
  }
}
