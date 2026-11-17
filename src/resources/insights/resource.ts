import type { HttpClient } from '../../core/http'

import { createGetInsight } from './get'
import { createListInsights } from './list'

export type InsightsResource = {
  /** `GET /v1/insights` — the brand's Brew Insights findings, most severe first, with `freshness`; filter by `state` and `severity`, and `include` `pulse` / `report` / `suggestions` / `memo` (scope: `emails`). */
  readonly list: ReturnType<typeof createListInsights>
  /** `GET /v1/insights/{insightId}` — one finding in full (frozen `metrics`, `evidence`, `method`, `generatedBy`); `404 INSIGHT_NOT_FOUND` for an unknown or other-brand id (scope: `emails`). */
  readonly get: ReturnType<typeof createGetInsight>
}

export function createInsightsResource(client: HttpClient): InsightsResource {
  return {
    list: createListInsights(client),
    get: createGetInsight(client),
  }
}
