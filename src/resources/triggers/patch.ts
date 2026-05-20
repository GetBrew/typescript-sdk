import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Trigger } from './types'

/**
 * Full PATCH input — either an update body (title / description /
 * payloadSchema) or a status-toggle body. The server rejects bodies
 * that match neither branch OR both branches with 400
 * INVALID_REQUEST.
 *
 * Prefer the sugar wrappers (`brew.triggers.enable`,
 * `brew.triggers.disable`) for status toggles; use this when you need
 * to update metadata fields.
 */
export type PatchTriggerInput = components['schemas']['TriggersPatchRequest']

export type PatchTriggerResponse = { trigger: Trigger }

/**
 * `PATCH /v1/triggers` — update metadata OR toggle status.
 *
 * Note: the API requires at least one editable field alongside
 * `triggerEventId` for an update; a bare id with no fields is
 * rejected so callers who meant to toggle status can't accidentally
 * no-op.
 */
export function createPatchTrigger(client: HttpClient) {
  function patchTrigger(
    input: PatchTriggerInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<PatchTriggerResponse>>
  function patchTrigger(
    input: PatchTriggerInput,
    options?: RequestOptions
  ): Promise<PatchTriggerResponse>
  async function patchTrigger(
    input: PatchTriggerInput,
    options?: RequestOptions
  ): Promise<PatchTriggerResponse | BrewRawResponse<PatchTriggerResponse>> {
    const response = await client.request<PatchTriggerResponse>({
      method: 'PATCH',
      path: '/v1/triggers',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return patchTrigger
}

/**
 * Sugar over `patchTrigger({ triggerEventId, status: 'enabled' })`.
 */
export function createEnableTrigger(
  patchTrigger: ReturnType<typeof createPatchTrigger>
) {
  return function enableTrigger(
    input: { triggerEventId: string },
    options?: RequestOptions
  ): Promise<PatchTriggerResponse> {
    return patchTrigger(
      { triggerEventId: input.triggerEventId, status: 'enabled' },
      options
    )
  }
}

/**
 * Sugar over `patchTrigger({ triggerEventId, status: 'disabled' })`.
 */
export function createDisableTrigger(
  patchTrigger: ReturnType<typeof createPatchTrigger>
) {
  return function disableTrigger(
    input: { triggerEventId: string },
    options?: RequestOptions
  ): Promise<PatchTriggerResponse> {
    return patchTrigger(
      { triggerEventId: input.triggerEventId, status: 'disabled' },
      options
    )
  }
}
