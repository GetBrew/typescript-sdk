import type { HttpClient } from '../../core/http'

import { createAutomationAnalytics } from './automations'
import { createProductAnalyticsIdentityToken } from './create-identity-token'
import { createEventCounts } from './event-counts'
import { createEventsAnalytics, createEventsAnalyticsAll } from './events'
import { createAnalyticsOverview } from './overview'
import { createTrackProductAnalytics } from './track'

/**
 * Analytics reports and trusted product-event ingestion. Send rows live at
 * `brew.sends.*`; fired-trigger history is `brew.automations.triggerInstances.*`.
 */
export type AnalyticsResource = {
  /** `POST /v1/analytics/track` — durably ingest product events (scope: `automations`). */
  readonly track: ReturnType<typeof createTrackProductAnalytics>
  /** `POST /v1/analytics/identity-token` — bind a browser identity to an existing contact (scope: `contacts`). */
  readonly createIdentityToken: ReturnType<
    typeof createProductAnalyticsIdentityToken
  >
  /** `GET /v1/analytics/overview` — app-parity totals, rates, and timeseries (scope: `emails`). */
  readonly overview: ReturnType<typeof createAnalyticsOverview>
  /** `GET /v1/analytics/automations` — windowed per-automation performance + totals (scope: `automations`). */
  readonly automations: ReturnType<typeof createAutomationAnalytics>
  /** `GET /v1/analytics/events` — unified event explorer across email/automation/trigger/inbound (scope: `emails`). */
  readonly events: ReturnType<typeof createEventsAnalytics>
  /** Auto-pager over `events` — yields every matching `EventRow`. */
  readonly eventsAll: ReturnType<typeof createEventsAnalyticsAll>
  /** `GET /v1/analytics/events` with `groupBy` / `bucket` — counts of the email events the same filters list, per field value and/or period (scope: `emails`). */
  readonly eventCounts: ReturnType<typeof createEventCounts>
}

export function createAnalyticsResource(client: HttpClient): AnalyticsResource {
  return {
    track: createTrackProductAnalytics(client),
    createIdentityToken: createProductAnalyticsIdentityToken(client),
    overview: createAnalyticsOverview(client),
    automations: createAutomationAnalytics(client),
    events: createEventsAnalytics(client),
    eventsAll: createEventsAnalyticsAll(client),
    eventCounts: createEventCounts(client),
  }
}
