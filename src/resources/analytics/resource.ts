import type { HttpClient } from '../../core/http'

import { createAutomationAnalytics } from './automations'
import { createCampaignAnalytics } from './campaigns'
import { createEventsAnalytics, createEventsAnalyticsAll } from './events'

export type AnalyticsResource = {
  /** `GET /v1/analytics/campaigns` — lifetime per-campaign KPIs (scope: `emails`). */
  readonly campaigns: ReturnType<typeof createCampaignAnalytics>
  /** `GET /v1/analytics/automations` — windowed per-automation performance + totals (scope: `automations`). */
  readonly automations: ReturnType<typeof createAutomationAnalytics>
  /** `GET /v1/analytics/events` — unified event explorer across email/automation/trigger/inbound (scope: `emails`). */
  readonly events: ReturnType<typeof createEventsAnalytics>
  /** Auto-pager over `events` — yields every matching `EventRow`. */
  readonly eventsAll: ReturnType<typeof createEventsAnalyticsAll>
}

export function createAnalyticsResource(client: HttpClient): AnalyticsResource {
  return {
    campaigns: createCampaignAnalytics(client),
    automations: createAutomationAnalytics(client),
    events: createEventsAnalytics(client),
    eventsAll: createEventsAnalyticsAll(client),
  }
}
