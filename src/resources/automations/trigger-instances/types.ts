import type { components, operations } from '../../../generated/openapi-types'

export type TriggerInstancesListResponse =
  components['schemas']['TriggerInstancesListResponse']

export type TriggerInstance = components['schemas']['TriggerInstance']

export type TriggerInstanceState = TriggerInstance['state']

export type ListTriggerInstancesInput = NonNullable<
  operations['listTriggerInstances']['parameters']['query']
>
