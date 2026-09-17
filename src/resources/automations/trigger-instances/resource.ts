import type { HttpClient } from '../../../core/http'

import { createGetTriggerInstance } from './get'
import {
  createListAllTriggerInstances,
  createListTriggerInstances,
} from './list'

export type TriggerInstancesResource = {
  /** `GET /v1/automations/trigger-instances` — the audit log of every inbound fire, newest first; filter with `triggerEventId` (scope: `automations`). */
  readonly list: ReturnType<typeof createListTriggerInstances>
  /** Auto-pager over `list` — yields every matching `TriggerInstance`. */
  readonly listAll: ReturnType<typeof createListAllTriggerInstances>
  /** `GET /v1/automations/trigger-instances/{triggerInstanceId}` — one instance as the bare row; `404 TRIGGER_INSTANCE_NOT_FOUND` when unknown (scope: `automations`). */
  readonly get: ReturnType<typeof createGetTriggerInstance>
}

export function createTriggerInstancesResource(
  client: HttpClient
): TriggerInstancesResource {
  return {
    list: createListTriggerInstances(client),
    listAll: createListAllTriggerInstances(client),
    get: createGetTriggerInstance(client),
  }
}
