import type { components } from '../../../generated/openapi-types'

/** A single trigger row. */
export type Trigger = components['schemas']['TriggerRow']

/** `{ data, pagination }` envelope returned by `GET /v1/automations/triggers`. */
export type TriggersListResponse = components['schemas']['TriggersListResponse']
