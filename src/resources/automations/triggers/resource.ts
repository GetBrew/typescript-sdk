import type { HttpClient } from '../../../core/http'

import {
  createGetTriggerContract,
  createPutTriggerContract,
  createValidateTriggerPayload,
} from './contract'
import { createCreateTrigger } from './create'
import { createDeleteTrigger } from './delete'
import { createFireTrigger } from './fire'
import { createListTriggers } from './list'
import { createPatchTrigger } from './patch'
import { createTriggerReady } from './ready'

export type TriggersResource = {
  /** `GET /v1/automations/triggers` — the single triggers read. List all (omit `triggerEventId`), or fetch one (`triggerEventId` → single-row page) (scope: `automations`). */
  readonly list: ReturnType<typeof createListTriggers>
  /** `POST /v1/automations/triggers` — deterministic create (returns the bare row) (scope: `automations`). */
  readonly create: ReturnType<typeof createCreateTrigger>
  /** `POST /v1/automations/triggers/{triggerEventId}/fire` — fire a trigger; starts one run per published automation attached to it (scope: `automations`). */
  readonly fire: ReturnType<typeof createFireTrigger>
  /** `GET /v1/automations/triggers/{triggerEventId}/fire` — preflight WITHOUT firing: credential verdict + payload contract + what a fire would start (scope: `automations`). */
  readonly ready: ReturnType<typeof createTriggerReady>
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
  readonly validateContract: ReturnType<typeof createValidateTriggerPayload>
}

export function createTriggersResource(client: HttpClient): TriggersResource {
  return {
    list: createListTriggers(client),
    create: createCreateTrigger(client),
    fire: createFireTrigger(client),
    ready: createTriggerReady(client),
    patch: createPatchTrigger(client),
    delete: createDeleteTrigger(client),
    getContract: createGetTriggerContract(client),
    putContract: createPutTriggerContract(client),
    validateContract: createValidateTriggerPayload(client),
  }
}
