import type { HttpClient } from '../../core/http'

import { createCreateSend } from './create'
import { createTestSend } from './test'

export type SendsResource = {
  /** `POST /v1/sends` — start an async campaign send (HTTP 202). */
  readonly create: ReturnType<typeof createCreateSend>
  /** `POST /v1/sends/test` — one-off [TEST] delivery to a single address (HTTP 200). */
  readonly test: ReturnType<typeof createTestSend>
}

export function createSendsResource(client: HttpClient): SendsResource {
  return {
    create: createCreateSend(client),
    test: createTestSend(client),
  }
}
