import type { HttpClient } from '../../core/http'

import { createAutomationAnalytics } from './automations'
import { createCampaignAnalytics } from './campaigns'

export type AnalyticsResource = {
  /** `GET /v1/analytics/campaigns` — lifetime per-campaign KPIs (scope: `emails`). */
  readonly campaigns: ReturnType<typeof createCampaignAnalytics>
  /** `GET /v1/analytics/automations` — windowed per-automation performance + totals (scope: `automations`). */
  readonly automations: ReturnType<typeof createAutomationAnalytics>
}

export function createAnalyticsResource(client: HttpClient): AnalyticsResource {
  return {
    campaigns: createCampaignAnalytics(client),
    automations: createAutomationAnalytics(client),
  }
}
