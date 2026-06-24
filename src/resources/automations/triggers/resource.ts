import type { HttpClient } from '../../../core/http'

import { createCreateTrigger } from './create'
import { createDeleteTrigger } from './delete'
import { createFireTrigger } from './fire'
import { createListTriggers } from './list'
import { createPatchTrigger } from './patch'

export type TriggersResource = {
  /** `GET /v1/automations/triggers` — the single triggers read. List all (omit `triggerEventId`), or fetch one (`triggerEventId` → single-row page) (scope: `automations`). */
  readonly list: ReturnType<typeof createListTriggers>
  /** `POST /v1/automations/triggers` — deterministic create (returns the bare row) (scope: `automations`). */
  readonly create: ReturnType<typeof createCreateTrigger>
  /** `POST /v1/automations/triggers/{triggerEventId}/fire` — fire a trigger; starts one run per published automation attached to it (scope: `automations`). */
  readonly fire: ReturnType<typeof createFireTrigger>
  /**
   * `PATCH /v1/automations/triggers/{triggerEventId}` — update trigger
   * metadata (title, description, payloadSchema). Trigger rows have no
   * status field — fire is gated by the bound automation being published.
   * To stop a trigger from firing, unpublish its automation; to remove a
   * trigger entirely, use `delete` (scope: `automations`).
   */
  readonly patch: ReturnType<typeof createPatchTrigger>
  /** `DELETE /v1/automations/triggers/{triggerEventId}` — destructive with dependency guard (scope: `automations`). */
  readonly delete: ReturnType<typeof createDeleteTrigger>
}

export function createTriggersResource(client: HttpClient): TriggersResource {
  return {
    list: createListTriggers(client),
    create: createCreateTrigger(client),
    fire: createFireTrigger(client),
    patch: createPatchTrigger(client),
    delete: createDeleteTrigger(client),
  }
}
