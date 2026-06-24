import type { HttpClient } from '../../core/http'

import { createCreateAutomation } from './create'
import { createDeleteAutomation } from './delete'
import { createListAutomations } from './list'
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
  /** `GET /v1/automations` — the single automations read. List all (omit `automationId`; lean), or fetch one (`automationId` → single-row page; `include: 'graph' | 'versions'` for the graph / version history) (scope: `automations`). */
  readonly list: ReturnType<typeof createListAutomations>
  /** `POST /v1/automations` — deterministic create (scope: `automations`). */
  readonly create: ReturnType<typeof createCreateAutomation>
  /** `POST /v1/automations/{automationId}/test` — start a suppression-aware TEST run (no real mail) (scope: `automations`). */
  readonly test: ReturnType<typeof createTestAutomation>
  /** `PATCH /v1/automations/{automationId}` — update metadata and/or the graph, OR change the published lifecycle (scope: `automations`). */
  readonly patch: ReturnType<typeof createPatchAutomation>
  /** `PATCH /v1/automations/{automationId}` with `{ published: true }`. Pass `automationVersionId` to publish a specific historical version (scope: `automations`). */
  readonly publish: ReturnType<typeof createPublishAutomation>
  /** `PATCH /v1/automations/{automationId}` with `{ published: false }` (scope: `automations`). */
  readonly unpublish: ReturnType<typeof createUnpublishAutomation>
  /** `DELETE /v1/automations/{automationId}` — cascade (scope: `automations`). */
  readonly delete: ReturnType<typeof createDeleteAutomation>
  /** `/v1/automations/triggers(/{triggerEventId}(/fire))` — trigger CRUD + fire. */
  readonly triggers: TriggersResource
  /** `/v1/automations/runs` — read-only run history. */
  readonly runs: AutomationRunsResource
}

export function createAutomationsResource(
  client: HttpClient
): AutomationsResource {
  return {
    list: createListAutomations(client),
    create: createCreateAutomation(client),
    test: createTestAutomation(client),
    patch: createPatchAutomation(client),
    publish: createPublishAutomation(client),
    unpublish: createUnpublishAutomation(client),
    delete: createDeleteAutomation(client),
    triggers: createTriggersResource(client),
    runs: createAutomationRunsResource(client),
  }
}
