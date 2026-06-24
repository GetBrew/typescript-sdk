import type { HttpClient } from '../../../core/http'

import {
  createListAllTriggerInstances,
  createListTriggerInstances,
} from './list'

export type AnalyticsTriggerInstancesResource = {
  /** `GET /v1/analytics/trigger-instances` — the single fired-trigger read. List instances (omit `triggerInstanceId`; filter with `triggerEventId`), or fetch one (`triggerInstanceId` → single-row page) (scope: `automations`). */
  readonly list: ReturnType<typeof createListTriggerInstances>
  /** Auto-pager over `list` — yields every matching trigger instance. */
  readonly listAll: ReturnType<typeof createListAllTriggerInstances>
}

export function createAnalyticsTriggerInstancesResource(
  client: HttpClient
): AnalyticsTriggerInstancesResource {
  return {
    list: createListTriggerInstances(client),
    listAll: createListAllTriggerInstances(client),
  }
}
