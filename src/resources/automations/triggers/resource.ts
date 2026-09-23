import type { HttpClient } from '../../../core/http'

import {
  createGetTriggerContract,
  createPutTriggerContract,
  createValidateTriggerPayload,
} from './contract'
import { createCreateTrigger } from './create'
import { createDeleteTrigger } from './delete'
import { createFireTrigger } from './fire'
import { createGetTrigger } from './get'
import { createListTriggers } from './list'
import { createPatchTrigger } from './patch'
import { createTriggerReadiness } from './readiness'

export type TriggersResource = {
  /** `GET /v1/automations/triggers` — every trigger in the brand, paged with `limit` / `cursor` (scope: `automations`). */
  readonly list: ReturnType<typeof createListTriggers>
  /** `GET /v1/automations/triggers/{triggerEventId}` — one trigger as the bare row (scope: `automations`). */
  readonly get: ReturnType<typeof createGetTrigger>
  /** `POST /v1/automations/triggers` — deterministic create (returns the bare row) (scope: `automations`). */
  readonly create: ReturnType<typeof createCreateTrigger>
  /** `POST /v1/automations/triggers/{triggerEventId}/fire` — fire a trigger; starts one run per published automation attached to it (scope: `automations`). */
  readonly fire: ReturnType<typeof createFireTrigger>
  /** `GET /v1/automations/triggers/{triggerEventId}/readiness` — preflight WITHOUT firing: credential verdict + payload contract + what a fire would start, as a bare body (scope: `automations`). */
  readonly readiness: ReturnType<typeof createTriggerReadiness>
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
  /** `GET /v1/automations/triggers/{triggerEventId}/contract` — the stored contract when declared, the derived one otherwise; `format` renders ts/zod/jsonschema/skill (scope: `automations`). */
  readonly getContract: ReturnType<typeof createGetTriggerContract>
  /** `PUT /v1/automations/triggers/{triggerEventId}/contract` — declare/replace the stored contract (tree-walked before any write; enforcement stays off) (scope: `automations`). */
  readonly putContract: ReturnType<typeof createPutTriggerContract>
  /** `POST /v1/automations/triggers/{triggerEventId}/contract/validate` — dry-run a payload through the fire path's validator; never fires (scope: `automations`). */
  readonly validatePayload: ReturnType<typeof createValidateTriggerPayload>
}

export function createTriggersResource(client: HttpClient): TriggersResource {
  return {
    list: createListTriggers(client),
    get: createGetTrigger(client),
    create: createCreateTrigger(client),
    fire: createFireTrigger(client),
    readiness: createTriggerReadiness(client),
    patch: createPatchTrigger(client),
    delete: createDeleteTrigger(client),
    getContract: createGetTriggerContract(client),
    putContract: createPutTriggerContract(client),
    validatePayload: createValidateTriggerPayload(client),
  }
}
