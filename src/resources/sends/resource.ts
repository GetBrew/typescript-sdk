import type { HttpClient } from '../../core/http'

import { createCreateSend } from './create'
import { createGetSend } from './get'
import { createListSends } from './list'
import { createListAllSends } from './list-all'
import {
  createListAllSendEvents,
  createListSendEvents,
} from './list-events'
import {
  createListAllSendsForEmail,
  createListSendsForEmail,
} from './list-for-email'
import { createTestSend } from './test'

export type SendsResource = {
  /** `POST /v1/sends` — start an async campaign send (HTTP 202). */
  readonly create: ReturnType<typeof createCreateSend>
  /** `POST /v1/sends/test` — one-off [TEST] delivery to a single address (HTTP 200). */
  readonly test: ReturnType<typeof createTestSend>
  /** `GET /v1/sends` — list campaign sends + stats. Returns `{ data, pagination }`. */
  readonly list: ReturnType<typeof createListSends>
  /** Auto-pager over `list` — yields every matching `Send`. */
  readonly listAll: ReturnType<typeof createListAllSends>
  /** `GET /v1/emails/{emailId}/sends` — one design's send history. Returns `{ data, pagination }`. */
  readonly listForEmail: ReturnType<typeof createListSendsForEmail>
  /** Auto-pager over `listForEmail` — yields every `Send` of one design. */
  readonly listAllForEmail: ReturnType<typeof createListAllSendsForEmail>
  /** `GET /v1/sends/{sendId}` — single send row (or `404 SEND_NOT_FOUND`). */
  readonly get: ReturnType<typeof createGetSend>
  /** `GET /v1/sends/{sendId}/events` — per-recipient event feed. Returns `{ data, pagination }`. */
  readonly listEvents: ReturnType<typeof createListSendEvents>
  /** Auto-pager over `listEvents` — yields every `SendEvent` of one send. */
  readonly listAllEvents: ReturnType<typeof createListAllSendEvents>
}

export function createSendsResource(client: HttpClient): SendsResource {
  return {
    create: createCreateSend(client),
    test: createTestSend(client),
    list: createListSends(client),
    listAll: createListAllSends(client),
    listForEmail: createListSendsForEmail(client),
    listAllForEmail: createListAllSendsForEmail(client),
    get: createGetSend(client),
    listEvents: createListSendEvents(client),
    listAllEvents: createListAllSendEvents(client),
  }
}
