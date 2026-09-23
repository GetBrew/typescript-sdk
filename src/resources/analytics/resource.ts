import type { HttpClient } from '../../core/http'

import { createAutomationAnalytics } from './automations'
import { createEventsAnalytics, createEventsAnalyticsAll } from './events'
import { createAnalyticsOverview } from './overview'

/**
 * `brew.analytics` keeps only REPORTS in v1. The row reads that used to
 * live here moved to the resources that own them: campaign and send rows
 * are `brew.sends.list(...)` / `brew.sends.get(...)`, and fired-trigger
 * history is `brew.automations.triggerInstances.*`.
 */
export type AnalyticsResource = {
  /** `GET /v1/analytics/overview` — app-parity totals, rates, and timeseries (scope: `emails`). */
  readonly overview: ReturnType<typeof createAnalyticsOverview>
  /** `GET /v1/analytics/automations` — windowed per-automation performance + totals (scope: `automations`). */
  readonly automations: ReturnType<typeof createAutomationAnalytics>
  /** `GET /v1/analytics/events` — unified event explorer across email/automation/trigger/inbound (scope: `emails`). */
  readonly events: ReturnType<typeof createEventsAnalytics>
  /** Auto-pager over `events` — yields every matching `EventRow`. */
  readonly eventsAll: ReturnType<typeof createEventsAnalyticsAll>
}

export function createAnalyticsResource(client: HttpClient): AnalyticsResource {
  return {
    overview: createAnalyticsOverview(client),
    automations: createAutomationAnalytics(client),
    events: createEventsAnalytics(client),
    eventsAll: createEventsAnalyticsAll(client),
  }
}
