import type { HttpClient } from '../../../core/http'

import { createCreateTrigger } from './create'
import { createDeleteTrigger } from './delete'
import { createFireTrigger } from './fire'
import { createGetTrigger, createListTriggers } from './list'
import { createPatchTrigger } from './patch'

export type TriggersResource = {
  /** `POST /v1/automations/triggers` — deterministic create (returns the bare row). */
  readonly create: ReturnType<typeof createCreateTrigger>
  /** `POST /v1/automations/triggers/{triggerEventId}/fire` — fire a trigger; starts one run per published automation attached to it. */
  readonly fire: ReturnType<typeof createFireTrigger>
  /** `GET /v1/automations/triggers` — list every trigger in the brand (`{ data, pagination }`). */
  readonly list: ReturnType<typeof createListTriggers>
  /** `GET /v1/automations/triggers/{triggerEventId}` — single trigger (bare row). */
  readonly get: ReturnType<typeof createGetTrigger>
  /**
   * `PATCH /v1/automations/triggers/{triggerEventId}` — update trigger
   * metadata (title, description, payloadSchema). Trigger rows have no
   * status field — fire is gated by the bound automation being published.
   * To stop a trigger from firing, unpublish its automation; to remove a
   * trigger entirely, use `delete`.
   */
  readonly patch: ReturnType<typeof createPatchTrigger>
  /** `DELETE /v1/automations/triggers/{triggerEventId}` — destructive with dependency guard. */
  readonly delete: ReturnType<typeof createDeleteTrigger>
}

export function createTriggersResource(client: HttpClient): TriggersResource {
  return {
    create: createCreateTrigger(client),
    fire: createFireTrigger(client),
    list: createListTriggers(client),
    get: createGetTrigger(client),
    patch: createPatchTrigger(client),
    delete: createDeleteTrigger(client),
  }
}
