import type { HttpClient } from '../../core/http'

import { createCreateSend } from './create'
import { createGetSend } from './get'
import { createListSends } from './list'
import { createListAllSends } from './list-all'
import { createTestSend } from './test'

export type SendsResource = {
  /** `POST /v1/sends` — start an async campaign send (HTTP 202). */
  readonly create: ReturnType<typeof createCreateSend>
  /** `POST /v1/sends { mode: 'test' }` — one-off test/preview send (HTTP 200). */
  readonly test: ReturnType<typeof createTestSend>
  /** `GET /v1/sends` — list campaign sends + stats. Returns `{ sends, pagination }`. */
  readonly list: ReturnType<typeof createListSends>
  /** Auto-pager over `list` — yields every matching `Send`. */
  readonly listAll: ReturnType<typeof createListAllSends>
  /** `GET /v1/sends?emailId=…` — single-element `{ sends: [row] }` (or `404 SEND_NOT_FOUND`). */
  readonly get: ReturnType<typeof createGetSend>
}

export function createSendsResource(client: HttpClient): SendsResource {
  return {
    create: createCreateSend(client),
    test: createTestSend(client),
    list: createListSends(client),
    listAll: createListAllSends(client),
    get: createGetSend(client),
  }
}
