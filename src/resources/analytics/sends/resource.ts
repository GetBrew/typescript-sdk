import type { HttpClient } from '../../../core/http'

import { createGetSend } from './get'
import { createListAllSends, createListSends } from './list'
import {
  createListAllSendEvents,
  createListSendEvents,
} from './list-events'
import {
  createListAllSendsForEmail,
  createListSendsForEmail,
} from './list-for-email'

export type AnalyticsSendsResource = {
  /** `GET /v1/analytics/sends` — list campaign sends + stats. Returns `{ data, pagination }`. */
  readonly list: ReturnType<typeof createListSends>
  /** Auto-pager over `list` — yields every matching `Send`. */
  readonly listAll: ReturnType<typeof createListAllSends>
  /** `GET /v1/analytics/sends/{sendId}` — single send row (or `404 SEND_NOT_FOUND`). */
  readonly get: ReturnType<typeof createGetSend>
  /** `GET /v1/analytics/sends/{sendId}/events` — per-recipient event feed. Returns `{ data, pagination }`. */
  readonly listEvents: ReturnType<typeof createListSendEvents>
  /** Auto-pager over `listEvents` — yields every `SendEvent` of one send. */
  readonly listAllEvents: ReturnType<typeof createListAllSendEvents>
  /** `GET /v1/emails/{emailId}/sends` — one design's send history. Returns `{ data, pagination }`. */
  readonly listForEmail: ReturnType<typeof createListSendsForEmail>
  /** Auto-pager over `listForEmail` — yields every `Send` of one design. */
  readonly listAllForEmail: ReturnType<typeof createListAllSendsForEmail>
}

export function createAnalyticsSendsResource(
  client: HttpClient
): AnalyticsSendsResource {
  return {
    list: createListSends(client),
    listAll: createListAllSends(client),
    get: createGetSend(client),
    listEvents: createListSendEvents(client),
    listAllEvents: createListAllSendEvents(client),
    listForEmail: createListSendsForEmail(client),
    listAllForEmail: createListAllSendsForEmail(client),
  }
}
