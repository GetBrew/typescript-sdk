import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { AutomationConnectionInput, AutomationNodeInput } from './create'
import type { Automation } from './types'

/**
 * `PATCH /v1/automations/{automationId}` body — the update fields per
 * `AUTOMATIONS_UPDATE_REQUEST_SCHEMA`. At least one of `name |
 * description | nodes | connections | triggerEventId` must be supplied.
 * `automationId` travels in the PATH, not the body.
 *
 * Publishing is its own action — use `brew.automations.publish(...)` /
 * `.unpublish(...)` (the dedicated `POST …/publish` / `…/unpublish`
 * sub-routes), NOT this update call. Bodies that include the removed
 * `prompt` / `autoCreateEmails` / `published` fields are rejected by
 * the server's strict schema (`400 INVALID_REQUEST`). AI authoring
 * stays on the chat-side orchestrator only; SDK consumers chain
 * deterministic calls.
 */
export type PatchAutomationInput = {
  /** Path param — which automation to update. */
  automationId: string
  // update fields (at least one required)
  name?: string
  description?: string
  nodes?: ReadonlyArray<AutomationNodeInput>
  connections?: ReadonlyArray<AutomationConnectionInput>
  triggerEventId?: string
}

/**
 * `PATCH /v1/automations/{automationId}` response — the BARE updated
 * `AutomationRow`, NOT a `{ automations: [...] }` envelope.
 */
export type PatchAutomationResponse = Automation

/**
 * `PATCH /v1/automations/{automationId}` — update metadata and/or the
 * graph. Graph updates persist a new `automationVersionId` on the same
 * `automationId`. Returns the bare updated row.
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
 * `POST /v1/automations/{automationId}/publish` — promote the
 * automation to live so its trigger starts matching fires. Pass
 * `automationVersionId` to publish a specific historical version;
 * omit it to publish the current latest. Returns the bare published
 * `AutomationRow`.
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
    const body = input.automationVersionId
      ? { automationVersionId: input.automationVersionId }
      : {}
    const response = await client.request<PatchAutomationResponse>({
      method: 'POST',
      path: `/v1/automations/${encodeURIComponent(input.automationId)}/publish`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return publishAutomation
}

/**
 * `POST /v1/automations/{automationId}/unpublish` — take the
 * automation off live (its trigger stops matching fires; in-flight
 * runs finish). Empty body. Returns the bare row with
 * `published: false`. Returns `422 AUTOMATION_NOT_PUBLISHED` if the
 * automation was never live (surfaced as `BrewApiError`).
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
      method: 'POST',
      path: `/v1/automations/${encodeURIComponent(input.automationId)}/unpublish`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return unpublishAutomation
}
