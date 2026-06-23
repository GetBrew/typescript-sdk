import type { components } from '../../generated/openapi-types'

/** Envelope returned by `GET /v1/account`. */
export type AccountGetResponse = components['schemas']['AccountGetResponse']

/** The plan the org is currently on (`key` + display `name`). */
export type AccountPlan = AccountGetResponse['plan']

/** Credit allotment for the current period (`limit`, `used`, `remaining`). */
export type AccountCredits = AccountGetResponse['credits']

/** Email-send allotment for the current period (`limit`, `used`, `remaining`). */
export type AccountEmailSends = AccountGetResponse['emailSends']

/** The billing period these counters are scoped to (`start`/`end`). */
export type AccountPeriod = AccountGetResponse['period']
