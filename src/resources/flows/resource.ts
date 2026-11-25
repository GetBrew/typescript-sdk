import type { HttpClient } from '../../core/http'

import { createGetFlow } from './get'
import { createListFlows } from './list'

export type FlowsResource = {
  readonly list: ReturnType<typeof createListFlows>
  readonly get: ReturnType<typeof createGetFlow>
}

export function createFlowsResource(client: HttpClient): FlowsResource {
  return {
    list: createListFlows(client),
    get: createGetFlow(client),
  }
}
