import type { components } from '../../generated/openapi-types'

export type CampaignAnalyticsResponse =
  components['schemas']['CampaignAnalyticsResponse']
export type CampaignAnalyticsRow =
  CampaignAnalyticsResponse['campaigns'][number]

export type AutomationAnalyticsResponse =
  components['schemas']['AutomationAnalyticsResponse']
export type AutomationAnalyticsRow =
  AutomationAnalyticsResponse['automations'][number]
