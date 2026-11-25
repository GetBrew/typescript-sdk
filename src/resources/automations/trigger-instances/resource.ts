import type { HttpClient } from '../../../core/http'

import { createGetTriggerInstance } from './get'
import {
  createListAllTriggerInstances,
  createListTriggerInstances,
} from './list'

export type TriggerInstancesResource = {
  readonly list: ReturnType<typeof createListTriggerInstances>
  readonly listAll: ReturnType<typeof createListAllTriggerInstances>
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
