import type { components } from '../../../generated/openapi-types'

export type Trigger = components['schemas']['TriggerRow']

export type BrewEventTriggerConfig = NonNullable<Trigger['brewEvent']>

export type TriggersListResponse = components['schemas']['TriggersListResponse']
