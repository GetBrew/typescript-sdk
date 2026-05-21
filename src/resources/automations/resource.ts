import type { HttpClient } from '../../core/http'

import { createCreateAutomation } from './create'
import { createDeleteAutomation } from './delete'
import { createGetAutomation, createListAutomations } from './list'
import {
  createPatchAutomation,
  createPublishAutomation,
  createUnpublishAutomation,
} from './patch'

export type AutomationsResource = {
  /** `POST /v1/automations` — deterministic create (or dry-run via `dryRun: true`). */
  readonly create: ReturnType<typeof createCreateAutomation>
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
}

export function createAutomationsResource(
  client: HttpClient
): AutomationsResource {
  const patch = createPatchAutomation(client)
  return {
    create: createCreateAutomation(client),
    list: createListAutomations(client),
    get: createGetAutomation(client),
    patch,
    publish: createPublishAutomation(patch),
    unpublish: createUnpublishAutomation(patch),
    delete: createDeleteAutomation(client),
  }
}
