import type { HttpClient } from '../../core/http'

import { createCreateTrigger } from './create'
import { createDeleteTrigger } from './delete'
import { createGetTrigger, createListTriggers } from './list'
import { createPatchTrigger } from './patch'

export type TriggersResource = {
  /** `POST /v1/triggers` — deterministic create. */
  readonly create: ReturnType<typeof createCreateTrigger>
  /** `GET /v1/triggers` — list every trigger in the brand. */
  readonly list: ReturnType<typeof createListTriggers>
  /** `GET /v1/triggers?triggerEventId=…` — single trigger + optional includes. */
  readonly get: ReturnType<typeof createGetTrigger>
  /**
   * `PATCH /v1/triggers` — update trigger metadata (title, description,
   * payloadSchema). Trigger rows no longer have a status field — fire
   * is gated by the bound automation being published. To stop a trigger
   * from firing, unpublish its automation; to remove a trigger entirely,
   * use `delete`.
   */
  readonly patch: ReturnType<typeof createPatchTrigger>
  /** `DELETE /v1/triggers` — destructive with dependency guard. */
  readonly delete: ReturnType<typeof createDeleteTrigger>
}

export function createTriggersResource(client: HttpClient): TriggersResource {
  return {
    create: createCreateTrigger(client),
    list: createListTriggers(client),
    get: createGetTrigger(client),
    patch: createPatchTrigger(client),
    delete: createDeleteTrigger(client),
  }
}
