import type { components } from '../../../generated/openapi-types'

/**
 * A single trigger row. `key` is the developer key it fires by (absent when
 * unset); `appEmail` links a keyed trigger to the automation and design an
 * app-email setup wired to it.
 */
export type Trigger = components['schemas']['TriggerRow']

/**
 * The config on a Brew-event trigger (`provider: 'brew_event'`): the event
 * and which occurrences start it (`scope: 'domain'` with its `domainHost`,
 * or `scope: 'all'`).
 */
export type BrewEventTriggerConfig = NonNullable<Trigger['brewEvent']>

/** `{ data, pagination }` envelope returned by `GET /v1/automations/triggers`. */
export type TriggersListResponse = components['schemas']['TriggersListResponse']
