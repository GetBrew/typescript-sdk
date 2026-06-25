import type { components } from '../../generated/openapi-types'

/** Envelope returned by `GET /v1/usage`. */
export type UsageGetResponse = components['schemas']['UsageGetResponse']

/** The plan the org is currently on (`key` + display `name`). */
export type UsagePlan = UsageGetResponse['plan']

/** Credit allotment for the current period (`limit`, `used`, `remaining`). */
export type UsageCredits = UsageGetResponse['credits']

/** Email-send allotment for the current period (`limit`, `used`, `remaining`). */
export type UsageEmailSends = UsageGetResponse['emailSends']

/** The billing period these counters are scoped to (`start`/`end`). */
export type UsagePeriod = UsageGetResponse['period']
