import type { components, operations } from '../../../generated/openapi-types'

/** `{ data, pagination }` envelope returned by `GET /v1/analytics/trigger-instances`. */
export type TriggerInstancesListResponse =
  components['schemas']['EventsListResponse']

/** A single fired-trigger instance row. */
export type TriggerInstance = TriggerInstancesListResponse['data'][number]

/** A single fired-trigger instance with its derived contact + spawned run summary. */
export type TriggerInstanceDetail =
  components['schemas']['TriggerEventInstance']

/** Query params accepted by `brew.analytics.triggerInstances.list(...)`. */
export type ListTriggerInstancesInput = NonNullable<
  operations['listEvents']['parameters']['query']
>
