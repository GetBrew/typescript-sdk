import type { HttpClient } from '../../../core/http'

import {
  createGetTriggerInstance,
  createListAllTriggerInstances,
  createListTriggerInstances,
} from './list'

export type AnalyticsTriggerInstancesResource = {
  /** `GET /v1/analytics/trigger-instances` — list fired-trigger instances. Returns `{ data, pagination }`. */
  readonly list: ReturnType<typeof createListTriggerInstances>
  /** Auto-pager over `list` — yields every matching trigger instance. */
  readonly listAll: ReturnType<typeof createListAllTriggerInstances>
  /** `GET /v1/analytics/trigger-instances/{triggerInstanceId}` — one instance (or `404`). */
  readonly get: ReturnType<typeof createGetTriggerInstance>
}

export function createAnalyticsTriggerInstancesResource(
  client: HttpClient
): AnalyticsTriggerInstancesResource {
  return {
    list: createListTriggerInstances(client),
    listAll: createListAllTriggerInstances(client),
    get: createGetTriggerInstance(client),
  }
}
