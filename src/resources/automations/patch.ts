import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type {
  AutomationConnectionInput,
  AutomationNodeInput,
} from './create'
import type { Automation } from './types'

/**
 * `PATCH /v1/automations` body union — update | publish.
 *
 * - **Update**: any combination of `name | description | nodes |
 *   connections | triggerEventId | dryRun` alongside `automationId`.
 * - **Publish / unpublish**: `{ automationId, published, automationVersionId? }`.
 *
 * Bodies that mix branches (e.g. `nodes` + `published`) or include
 * the removed `prompt` / `autoCreateEmails` fields return
 * `400 INVALID_REQUEST`. AI authoring stays on the chat-side
 * orchestrator only; SDK consumers chain deterministic calls.
 */
export type PatchAutomationInput = {
  automationId: string
  // update branch
  name?: string
  description?: string
  nodes?: ReadonlyArray<AutomationNodeInput>
  connections?: ReadonlyArray<AutomationConnectionInput>
  triggerEventId?: string
  dryRun?: boolean
  // publish branch
  published?: boolean
  automationVersionId?: string
}

/**
 * `PATCH /v1/automations` response shape — mirrors the canonical
 * `{ automations: [row] }` envelope every other automations
 * endpoint returns. Destructure via `result.automations[0]`.
 */
export type PatchAutomationResponse = {
  automations: ReadonlyArray<Automation>
}

/**
 * `PATCH /v1/automations` — update graph OR publish / unpublish.
 * Body is a discriminated union (see API ref).
 */
export function createPatchAutomation(client: HttpClient) {
  function patchAutomation(
    input: PatchAutomationInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<PatchAutomationResponse>>
  function patchAutomation(
    input: PatchAutomationInput,
    options?: RequestOptions
  ): Promise<PatchAutomationResponse>
  async function patchAutomation(
    input: PatchAutomationInput,
    options?: RequestOptions
  ): Promise<
    PatchAutomationResponse | BrewRawResponse<PatchAutomationResponse>
  > {
    const response = await client.request<PatchAutomationResponse>({
      method: 'PATCH',
      path: '/v1/automations',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return patchAutomation
}

/**
 * Sugar — `patchAutomation({ automationId, published: true })`.
 * Pass `automationVersionId` to publish a specific historical version.
 */
export function createPublishAutomation(
  patchAutomation: ReturnType<typeof createPatchAutomation>
) {
  return async function publishAutomation(
    input: { automationId: string; automationVersionId?: string },
    options?: RequestOptions
  ): Promise<PatchAutomationResponse> {
    const body: PatchAutomationInput = {
      automationId: input.automationId,
      published: true,
      ...(input.automationVersionId
        ? { automationVersionId: input.automationVersionId }
        : {}),
    }
    return patchAutomation(body, options)
  }
}

/**
 * Sugar — `patchAutomation({ automationId, published: false })`.
 * Returns 422 `AUTOMATION_NOT_PUBLISHED` if the automation was
 * never live (surfaced as `BrewApiError`).
 */
export function createUnpublishAutomation(
  patchAutomation: ReturnType<typeof createPatchAutomation>
) {
  return async function unpublishAutomation(
    input: { automationId: string },
    options?: RequestOptions
  ): Promise<PatchAutomationResponse> {
    return patchAutomation(
      { automationId: input.automationId, published: false },
      options
    )
  }
}
