import type { components } from '../../../generated/openapi-types'

/** A single trigger row. */
export type Trigger = components['schemas']['TriggerRow']

/**
 * The config on a Brew-event trigger (`provider: 'brew_event'`): the event
 * and which occurrences start it (`scope: 'domain'` with its `domainHost`,
 * or `scope: 'all'`).
 */
export type BrewEventTriggerConfig = NonNullable<Trigger['brewEvent']>

/** `{ data, pagination }` envelope returned by `GET /v1/automations/triggers`. */
export type TriggersListResponse = components['schemas']['TriggersListResponse']
