import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Trigger } from './types'

/**
 * Metadata-only PATCH input — update `title`, `description`, or
 * `payloadSchema` on an existing trigger. Trigger rows no longer carry
 * a `status` field; to stop a trigger from firing, unpublish the bound
 * automation. The server rejects bodies that include `{ status }` with
 * `400 INVALID_REQUEST`, and rejects a bare `{ triggerEventId }` with
 * no editable fields so empty-noop PATCHes can't accidentally succeed.
 */
export type PatchTriggerInput = components['schemas']['TriggersPatchRequest']

export type PatchTriggerResponse = { trigger: Trigger }

/**
 * `PATCH /v1/triggers` — update trigger metadata.
 *
 * Requires at least one editable field (`title`, `description`, or
 * `payloadSchema`) alongside `triggerEventId`. The previous status-toggle
 * branch was removed when triggers became always-on; see the v5.0.0
 * release notes.
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
