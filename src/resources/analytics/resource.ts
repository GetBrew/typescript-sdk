import type { HttpClient } from '../../core/http'

import { createAutomationAnalytics } from './automations'
import { createCampaignAnalytics } from './campaigns'
import { createEventsAnalytics, createEventsAnalyticsAll } from './events'
import { createAnalyticsOverview } from './overview'
import {
  createAnalyticsSendsResource,
  type AnalyticsSendsResource,
} from './sends/resource'
import {
  createAnalyticsTriggerInstancesResource,
  type AnalyticsTriggerInstancesResource,
} from './trigger-instances/resource'

export type AnalyticsResource = {
  /** `GET /v1/analytics/overview` — app-parity totals, rates, and timeseries (scope: `emails`). */
  readonly overview: ReturnType<typeof createAnalyticsOverview>
  /** `GET /v1/analytics/campaigns` — lifetime per-campaign KPIs (scope: `emails`). */
  readonly campaigns: ReturnType<typeof createCampaignAnalytics>
  /** `GET /v1/analytics/automations` — windowed per-automation performance + totals (scope: `automations`). */
  readonly automations: ReturnType<typeof createAutomationAnalytics>
  /** `GET /v1/analytics/events` — unified event explorer across email/automation/trigger/inbound (scope: `emails`). */
  readonly events: ReturnType<typeof createEventsAnalytics>
  /** Auto-pager over `events` — yields every matching `EventRow`. */
  readonly eventsAll: ReturnType<typeof createEventsAnalyticsAll>
  /** `GET /v1/analytics/sends(/{sendId}(/events))` — campaign send reads + per-recipient event feeds. */
  readonly sends: AnalyticsSendsResource
  /** `GET /v1/analytics/trigger-instances(/{triggerInstanceId})` — fired-trigger instance history. */
  readonly triggerInstances: AnalyticsTriggerInstancesResource
}

export function createAnalyticsResource(client: HttpClient): AnalyticsResource {
  return {
    overview: createAnalyticsOverview(client),
    campaigns: createCampaignAnalytics(client),
    automations: createAutomationAnalytics(client),
    events: createEventsAnalytics(client),
    eventsAll: createEventsAnalyticsAll(client),
    sends: createAnalyticsSendsResource(client),
    triggerInstances: createAnalyticsTriggerInstancesResource(client),
  }
}
