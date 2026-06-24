import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { AutomationConnectionInput, AutomationNodeInput } from './create'
import type { Automation } from './types'

/**
 * `PATCH /v1/automations/{automationId}` body — the update fields per
 * `AUTOMATIONS_UPDATE_REQUEST_SCHEMA`. `automationId` travels in the PATH,
 * not the body.
 *
 * There are two kinds of update, and they are **mutually exclusive**:
 *
 * 1. **Content** — at least one of `name | description | nodes |
 *    connections | triggerEventId`. Graph updates persist a new
 *    `automationVersionId` on the same `automationId`.
 * 2. **Lifecycle** — `published: true` promotes the stored latest version
 *    live (the graph is validated first → `409 PUBLISH_VALIDATION_FAILED`
 *    on blockers); optionally pin `automationVersionId` to publish a
 *    specific historical version. `published: false` unpublishes (→
 *    `422 AUTOMATION_NOT_PUBLISHED` if it was never live).
 *
 * Combining `published` with content fields is rejected by the server's
 * strict schema (`400 INVALID_REQUEST`). For lifecycle changes prefer the
 * dedicated `brew.automations.publish(...)` / `.unpublish(...)`
 * convenience methods, which build the right body for you.
 */
export type PatchAutomationInput = {
  /** Path param — which automation to update. */
  automationId: string
  // content update fields (mutually exclusive with `published`)
  name?: string
  description?: string
  nodes?: ReadonlyArray<AutomationNodeInput>
  connections?: ReadonlyArray<AutomationConnectionInput>
  triggerEventId?: string
  // lifecycle update fields (mutually exclusive with the content fields)
  published?: boolean
  automationVersionId?: string
}

/**
 * `PATCH /v1/automations/{automationId}` response — the BARE updated
 * `AutomationRow`, NOT a `{ automations: [...] }` envelope.
 */
export type PatchAutomationResponse = Automation

/**
 * `PATCH /v1/automations/{automationId}` — update metadata and/or the
 * graph, OR change the published lifecycle. Graph updates persist a new
 * `automationVersionId` on the same `automationId`. Returns the bare
 * updated row.
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
    const { automationId, ...body } = input
    const response = await client.request<PatchAutomationResponse>({
      method: 'PATCH',
      path: `/v1/automations/${encodeURIComponent(automationId)}`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return patchAutomation
}

/**
 * `PATCH /v1/automations/{automationId}` with `{ published: true }` —
 * promote the automation to live so its trigger starts matching fires.
 * Pass `automationVersionId` to publish a specific historical version;
 * omit it to publish the stored latest. The server validates the graph
 * first and returns `409 PUBLISH_VALIDATION_FAILED` on blockers (surfaced
 * as a `BrewApiError`). Returns the bare published `AutomationRow`.
 *
 * (Convenience wrapper over `PATCH /v1/automations/{automationId}` — the
 * old `POST …/publish` sub-route no longer exists.)
 */
export function createPublishAutomation(client: HttpClient) {
  function publishAutomation(
    input: { automationId: string; automationVersionId?: string },
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<PatchAutomationResponse>>
  function publishAutomation(
    input: { automationId: string; automationVersionId?: string },
    options?: RequestOptions
  ): Promise<PatchAutomationResponse>
  async function publishAutomation(
    input: { automationId: string; automationVersionId?: string },
    options?: RequestOptions
  ): Promise<
    PatchAutomationResponse | BrewRawResponse<PatchAutomationResponse>
  > {
    const body: { published: true; automationVersionId?: string } = {
      published: true,
      ...(input.automationVersionId
        ? { automationVersionId: input.automationVersionId }
        : {}),
    }
    const response = await client.request<PatchAutomationResponse>({
      method: 'PATCH',
      path: `/v1/automations/${encodeURIComponent(input.automationId)}`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return publishAutomation
}

/**
 * `PATCH /v1/automations/{automationId}` with `{ published: false }` —
 * take the automation off live (its trigger stops matching fires;
 * in-flight runs finish). Returns the bare row with `published: false`,
 * or `422 AUTOMATION_NOT_PUBLISHED` if the automation was never live
 * (surfaced as a `BrewApiError`).
 *
 * (Convenience wrapper over `PATCH /v1/automations/{automationId}` — the
 * old `POST …/unpublish` sub-route no longer exists.)
 */
export function createUnpublishAutomation(client: HttpClient) {
  function unpublishAutomation(
    input: { automationId: string },
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<PatchAutomationResponse>>
  function unpublishAutomation(
    input: { automationId: string },
    options?: RequestOptions
  ): Promise<PatchAutomationResponse>
  async function unpublishAutomation(
    input: { automationId: string },
    options?: RequestOptions
  ): Promise<
    PatchAutomationResponse | BrewRawResponse<PatchAutomationResponse>
  > {
    const response = await client.request<PatchAutomationResponse>({
      method: 'PATCH',
      path: `/v1/automations/${encodeURIComponent(input.automationId)}`,
      body: { published: false },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return unpublishAutomation
}
