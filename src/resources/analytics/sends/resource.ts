import type { HttpClient } from '../../../core/http'

import { createListAllSends, createListSends } from './list'

export type AnalyticsSendsResource = {
  /** `GET /v1/analytics/sends` — the single sends read. List sends (omit `sendId`; narrow with `emailId`), or fetch one (`sendId` → single-row page; `include: 'events'` for inlined per-recipient events) (scope: `sends`). */
  readonly list: ReturnType<typeof createListSends>
  /** Auto-pager over `list` — yields every matching `Send`. */
  readonly listAll: ReturnType<typeof createListAllSends>
}

export function createAnalyticsSendsResource(
  client: HttpClient
): AnalyticsSendsResource {
  return {
    list: createListSends(client),
    listAll: createListAllSends(client),
  }
}
