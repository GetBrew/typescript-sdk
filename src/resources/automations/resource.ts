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
  readonly list: ReturnType<typeof createListAutomations>
  readonly get: ReturnType<typeof createGetAutomation>
  readonly create: ReturnType<typeof createCreateAutomation>
  readonly test: ReturnType<typeof createTestAutomation>
  readonly run: ReturnType<typeof createRunAutomation>
  readonly patch: ReturnType<typeof createPatchAutomation>
  readonly publish: ReturnType<typeof createPublishAutomation>
  readonly unpublish: ReturnType<typeof createUnpublishAutomation>
  readonly delete: ReturnType<typeof createDeleteAutomation>
  readonly triggers: TriggersResource
  readonly runs: AutomationRunsResource
  readonly audienceRuns: AudienceRunsResource
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
