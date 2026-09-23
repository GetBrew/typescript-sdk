import type { HttpClient } from '../../core/http'

import { createGetFlow } from './get'
import { createListFlows } from './list'

export type FlowsResource = {
  /**
   * `GET /v1/flows` — list public email flows as cards under
   * `{ data, pagination }`. Organization-wide; no `X-Brand-Id`.
   */
  readonly list: ReturnType<typeof createListFlows>
  /**
   * `GET /v1/flows/{slug}` — one flow as the bare row, with `anchor` and
   * `steps[]`; `include: 'html'` attaches each step's rendered HTML.
   */
  readonly get: ReturnType<typeof createGetFlow>
}

export function createFlowsResource(client: HttpClient): FlowsResource {
  return {
    list: createListFlows(client),
    get: createGetFlow(client),
  }
}
