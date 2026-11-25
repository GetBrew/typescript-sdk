import type { HttpClient } from '../../../core/http'

import { createEnsureBrewEventTrigger } from './brew-events'
import {
  createGetTriggerContract,
  createPutTriggerContract,
  createValidateTriggerPayload,
} from './contract'
import { createCreateTrigger } from './create'
import { createDeleteTrigger } from './delete'
import { createFireTrigger } from './fire'
import { createGetTrigger } from './get'
import { createEnsureIntegrationEventTrigger } from './integration-events'
import { createListTriggers } from './list'
import { createPatchTrigger } from './patch'
import { createTriggerReadiness } from './readiness'

export type TriggersResource = {
  readonly list: ReturnType<typeof createListTriggers>
  readonly get: ReturnType<typeof createGetTrigger>
  readonly create: ReturnType<typeof createCreateTrigger>
  readonly ensureBrewEvent: ReturnType<typeof createEnsureBrewEventTrigger>
  readonly ensureIntegrationEvent: ReturnType<
    typeof createEnsureIntegrationEventTrigger
  >
  readonly fire: ReturnType<typeof createFireTrigger>
  readonly readiness: ReturnType<typeof createTriggerReadiness>
  readonly patch: ReturnType<typeof createPatchTrigger>
  readonly delete: ReturnType<typeof createDeleteTrigger>
  readonly getContract: ReturnType<typeof createGetTriggerContract>
  readonly putContract: ReturnType<typeof createPutTriggerContract>
  readonly validatePayload: ReturnType<typeof createValidateTriggerPayload>
}

export function createTriggersResource(client: HttpClient): TriggersResource {
  return {
    list: createListTriggers(client),
    get: createGetTrigger(client),
    create: createCreateTrigger(client),
    ensureBrewEvent: createEnsureBrewEventTrigger(client),
    ensureIntegrationEvent: createEnsureIntegrationEventTrigger(client),
    fire: createFireTrigger(client),
    readiness: createTriggerReadiness(client),
    patch: createPatchTrigger(client),
    delete: createDeleteTrigger(client),
    getContract: createGetTriggerContract(client),
    putContract: createPutTriggerContract(client),
    validatePayload: createValidateTriggerPayload(client),
  }
}
