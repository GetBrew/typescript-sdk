import type { components, operations } from '../../../generated/openapi-types'

/** `{ data, pagination }` envelope returned by `GET /v1/automations/trigger-instances`. */
export type TriggerInstancesListResponse =
  components['schemas']['TriggerInstancesListResponse']

/** A single fired-trigger instance row — the audit log of one inbound fire. */
export type TriggerInstance = components['schemas']['TriggerInstance']

/**
 * How far one inbound fire got:
 * `received | verified | matched | partially_fired | fired | rejected |
 * dead_letter`.
 *
 * Branch on it rather than on the presence of `automationRunIds`:
 * `fired` means every matched automation started, `partially_fired`
 * means some starts are still being retried, and `rejected` pairs with
 * a `rejectionReason`.
 */
export type TriggerInstanceState = TriggerInstance['state']

/** Query params accepted by `brew.automations.triggerInstances.list(...)`. */
export type ListTriggerInstancesInput = NonNullable<
  operations['listTriggerInstances']['parameters']['query']
>
