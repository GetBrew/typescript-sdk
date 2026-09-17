import type { HttpClient } from '../../core/http'

import { createListFlows } from './list'

export type FlowsResource = {
  /**
   * `GET /v1/flows` — list public email flows (`{ data, pagination }`,
   * scope: `emails`), or fetch one by `slug` (`{ data: [flow] }` with
   * `anchor` + `steps[]`; `include: 'html'` for each step's rendered HTML).
   */
  readonly list: ReturnType<typeof createListFlows>
}

export function createFlowsResource(client: HttpClient): FlowsResource {
  return {
    list: createListFlows(client),
  }
}
