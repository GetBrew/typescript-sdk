import type { components } from '../../generated/openapi-types'

export type AutomationAnalyticsResponse =
  components['schemas']['AutomationAnalyticsResponse']
export type AutomationAnalyticsRow = AutomationAnalyticsResponse['data'][number]

export type EventsAnalyticsResponse =
  components['schemas']['EventsAnalyticsResponse']
export type EventRow = EventsAnalyticsResponse['data'][number]
