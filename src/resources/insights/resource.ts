import type { HttpClient } from '../../core/http'

import { createGetInsight } from './get'
import { createListInsights } from './list'

export type InsightsResource = {
  readonly list: ReturnType<typeof createListInsights>
  readonly get: ReturnType<typeof createGetInsight>
}

export function createInsightsResource(client: HttpClient): InsightsResource {
  return {
    list: createListInsights(client),
    get: createGetInsight(client),
  }
}
