import type { components } from '../../generated/openapi-types'

export type UsageGetResponse = components['schemas']['UsageGetResponse']

export type UsagePlan = UsageGetResponse['plan']

export type UsageCredits = UsageGetResponse['credits']

export type UsageEmailSends = UsageGetResponse['emailSends']

export type UsagePeriod = UsageGetResponse['period']
