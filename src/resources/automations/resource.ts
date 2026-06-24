import type { HttpClient } from '../../core/http'

import { createCreateAutomation } from './create'
import { createDeleteAutomation } from './delete'
import { createGetAutomation, createListAutomations } from './list'
import {
  createPatchAutomation,
  createPublishAutomation,
  createUnpublishAutomation,
} from './patch'
import {
  createAutomationRunsResource,
  type AutomationRunsResource,
} from './runs/resource'
import { createTestAutomation } from './test'
import {
  createTriggersResource,
  type TriggersResource,
} from './triggers/resource'

export type AutomationsResource = {
  /** `POST /v1/automations` — deterministic create. */
  readonly create: ReturnType<typeof createCreateAutomation>
  /** `POST /v1/automations/{automationId}/test` — start a suppression-aware TEST run (no real mail). */
  readonly test: ReturnType<typeof createTestAutomation>
  /** `GET /v1/automations` — list every automation in the brand. */
  readonly list: ReturnType<typeof createListAutomations>
  /** `GET /v1/automations?automationId=…` — single automation + optional includes. */
  readonly get: ReturnType<typeof createGetAutomation>
  /** `PATCH /v1/automations` — update OR publish / unpublish. */
  readonly patch: ReturnType<typeof createPatchAutomation>
  /** Sugar over `patch({ published: true })`. Pass `automationVersionId` to publish a specific historical version. */
  readonly publish: ReturnType<typeof createPublishAutomation>
  /** Sugar over `patch({ published: false })`. */
  readonly unpublish: ReturnType<typeof createUnpublishAutomation>
  /** `DELETE /v1/automations` — cascade. */
  readonly delete: ReturnType<typeof createDeleteAutomation>
  /** `/v1/automations/triggers(/{triggerEventId}(/fire))` — trigger CRUD + fire. */
  readonly triggers: TriggersResource
  /** `/v1/automations/runs(/{automationRunId})` — read-only run history. */
  readonly runs: AutomationRunsResource
}

export function createAutomationsResource(
  client: HttpClient
): AutomationsResource {
  const patch = createPatchAutomation(client)
  return {
    create: createCreateAutomation(client),
    test: createTestAutomation(client),
    list: createListAutomations(client),
    get: createGetAutomation(client),
    patch,
    publish: createPublishAutomation(patch),
    unpublish: createUnpublishAutomation(patch),
    delete: createDeleteAutomation(client),
    triggers: createTriggersResource(client),
    runs: createAutomationRunsResource(client),
  }
}
