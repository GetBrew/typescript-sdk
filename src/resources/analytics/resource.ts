import type { HttpClient } from '../../core/http'

import { createAutomationAnalytics } from './automations'
import { createEventCounts } from './event-counts'
import { createEventsAnalytics, createEventsAnalyticsAll } from './events'
import { createAnalyticsOverview } from './overview'

export type AnalyticsResource = {
  readonly overview: ReturnType<typeof createAnalyticsOverview>
  readonly automations: ReturnType<typeof createAutomationAnalytics>
  readonly events: ReturnType<typeof createEventsAnalytics>
  readonly eventsAll: ReturnType<typeof createEventsAnalyticsAll>
  readonly eventCounts: ReturnType<typeof createEventCounts>
}

export function createAnalyticsResource(client: HttpClient): AnalyticsResource {
  return {
    overview: createAnalyticsOverview(client),
    automations: createAutomationAnalytics(client),
    events: createEventsAnalytics(client),
    eventsAll: createEventsAnalyticsAll(client),
    eventCounts: createEventCounts(client),
  }
}
