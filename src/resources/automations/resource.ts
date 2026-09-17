import type { HttpClient } from '../../core/http'

import {
  createAudienceRunsResource,
  type AudienceRunsResource,
} from './audience-runs/resource'
import { createCreateAutomation } from './create'
import { createDeleteAutomation } from './delete'
import { createGetAutomation } from './get'
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
import { createRunAutomation } from './run'
import { createTestAutomation } from './test'
import {
  createTriggerInstancesResource,
  type TriggerInstancesResource,
} from './trigger-instances/resource'
import {
  createTriggersResource,
  type TriggersResource,
} from './triggers/resource'

export type AutomationsResource = {
  /** `GET /v1/automations` — every automation in the brand; rows are LEAN (no graph) (scope: `automations`). */
  readonly list: ReturnType<typeof createListAutomations>
  /** `GET /v1/automations/{automationId}` — one automation as the bare row; `include: 'graph' | 'versions'` attaches the graph / version history (scope: `automations`). */
  readonly get: ReturnType<typeof createGetAutomation>
  /** `POST /v1/automations` — deterministic create (scope: `automations`). */
  readonly create: ReturnType<typeof createCreateAutomation>
  /** `POST /v1/automations/{automationId}/test` — start a suppression-aware TEST run (no real mail) (scope: `automations`). */
  readonly test: ReturnType<typeof createTestAutomation>
  /** `POST /v1/automations/{automationId}/run` — preview, launch, or schedule a manual-audience run (scope: `automations`). */
  readonly run: ReturnType<typeof createRunAutomation>
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
  /** `/v1/automations/runs` — run history, the per-run detail read, and `cancel` for one in-flight run. */
  readonly runs: AutomationRunsResource
  /** `/v1/automations/audience-runs` — manual-audience history plus the `pause` / `resume` / `cancel` lifecycle actions. */
  readonly audienceRuns: AudienceRunsResource
  /** `/v1/automations/trigger-instances` — the audit log of every inbound fire, and one instance by id. */
  readonly triggerInstances: TriggerInstancesResource
}

export function createAutomationsResource(
  client: HttpClient
): AutomationsResource {
  return {
    list: createListAutomations(client),
    get: createGetAutomation(client),
    create: createCreateAutomation(client),
    test: createTestAutomation(client),
    run: createRunAutomation(client),
    patch: createPatchAutomation(client),
    publish: createPublishAutomation(client),
    unpublish: createUnpublishAutomation(client),
    delete: createDeleteAutomation(client),
    triggers: createTriggersResource(client),
    runs: createAutomationRunsResource(client),
    audienceRuns: createAudienceRunsResource(client),
    triggerInstances: createTriggerInstancesResource(client),
  }
}
