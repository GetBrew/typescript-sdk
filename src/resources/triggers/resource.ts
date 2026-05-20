import type { HttpClient } from '../../core/http'

import { createCreateTrigger } from './create'
import { createDeleteTrigger } from './delete'
import { createGetTrigger, createListTriggers } from './list'
import {
  createDisableTrigger,
  createEnableTrigger,
  createPatchTrigger,
} from './patch'

export type TriggersResource = {
  /** `POST /v1/triggers` — deterministic create. */
  readonly create: ReturnType<typeof createCreateTrigger>
  /** `GET /v1/triggers` — list every trigger in the brand. */
  readonly list: ReturnType<typeof createListTriggers>
  /** `GET /v1/triggers?triggerEventId=…` — single trigger + optional includes. */
  readonly get: ReturnType<typeof createGetTrigger>
  /** `PATCH /v1/triggers` — update metadata OR toggle status. */
  readonly patch: ReturnType<typeof createPatchTrigger>
  /** Sugar over `patch({ status: 'enabled' })`. */
  readonly enable: ReturnType<typeof createEnableTrigger>
  /** Sugar over `patch({ status: 'disabled' })`. */
  readonly disable: ReturnType<typeof createDisableTrigger>
  /** `DELETE /v1/triggers` — destructive with dependency guard. */
  readonly delete: ReturnType<typeof createDeleteTrigger>
}

export function createTriggersResource(client: HttpClient): TriggersResource {
  const patch = createPatchTrigger(client)
  return {
    create: createCreateTrigger(client),
    list: createListTriggers(client),
    get: createGetTrigger(client),
    patch,
    enable: createEnableTrigger(patch),
    disable: createDisableTrigger(patch),
    delete: createDeleteTrigger(client),
  }
}
