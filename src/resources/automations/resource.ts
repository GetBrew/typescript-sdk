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
import { createListAutomationVersions } from './versions'

export type AutomationsResource = {
  /** `POST /v1/automations` — deterministic create. */
  readonly create: ReturnType<typeof createCreateAutomation>
  /** `POST /v1/automations/{automationId}/test` — start a suppression-aware TEST run (no real mail). */
  readonly test: ReturnType<typeof createTestAutomation>
  /** `GET /v1/automations` — list every automation in the brand. */
  readonly list: ReturnType<typeof createListAutomations>
  /** `GET /v1/automations/{automationId}` — single automation (bare `AutomationRow`, full graph). */
  readonly get: ReturnType<typeof createGetAutomation>
  /** `PATCH /v1/automations/{automationId}` — update metadata and/or the graph. */
  readonly patch: ReturnType<typeof createPatchAutomation>
  /** `POST /v1/automations/{automationId}/publish`. Pass `automationVersionId` to publish a specific historical version. */
  readonly publish: ReturnType<typeof createPublishAutomation>
  /** `POST /v1/automations/{automationId}/unpublish`. */
  readonly unpublish: ReturnType<typeof createUnpublishAutomation>
  /** `GET /v1/automations/{automationId}/versions` — paged version history (`{ data, pagination }`). */
  readonly versions: ReturnType<typeof createListAutomationVersions>
  /** `DELETE /v1/automations/{automationId}` — cascade. */
  readonly delete: ReturnType<typeof createDeleteAutomation>
  /** `/v1/automations/triggers(/{triggerEventId}(/fire))` — trigger CRUD + fire. */
  readonly triggers: TriggersResource
  /** `/v1/automations/runs(/{automationRunId})` — read-only run history. */
  readonly runs: AutomationRunsResource
}

export function createAutomationsResource(
  client: HttpClient
): AutomationsResource {
  return {
    create: createCreateAutomation(client),
    test: createTestAutomation(client),
    list: createListAutomations(client),
    get: createGetAutomation(client),
    patch: createPatchAutomation(client),
    publish: createPublishAutomation(client),
    unpublish: createUnpublishAutomation(client),
    versions: createListAutomationVersions(client),
    delete: createDeleteAutomation(client),
    triggers: createTriggersResource(client),
    runs: createAutomationRunsResource(client),
  }
}
