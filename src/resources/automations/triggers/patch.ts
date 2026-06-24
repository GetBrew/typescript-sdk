import type { components } from '../../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { Trigger } from './types'

/**
 * Metadata-only PATCH input — the `triggerEventId` identifies the
 * trigger on the URL; supply at least one editable field (`title`,
 * `description`, or `payloadSchema`) in the body. Trigger rows no longer
 * carry a `status` field; to stop a trigger from firing, unpublish the
 * bound automation. The server rejects bodies with no editable fields so
 * empty-noop PATCHes can't accidentally succeed.
 */
export type PatchTriggerInput = {
  triggerEventId: string
} & components['schemas']['TriggersPatchRequest']

/**
 * Update returns the bare updated `Trigger` row.
 */
export type PatchTriggerResponse = Trigger

/**
 * `PATCH /v1/automations/triggers/{triggerEventId}` — update trigger
 * metadata.
 *
 * Requires at least one editable field (`title`, `description`, or
 * `payloadSchema`) in the body alongside the `triggerEventId` path param.
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
    const { triggerEventId, ...body } = input
    const response = await client.request<PatchTriggerResponse>({
      method: 'PATCH',
      path: `/v1/automations/triggers/${encodeURIComponent(triggerEventId)}`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return patchTrigger
}
