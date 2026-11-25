import type { components } from '../../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { Trigger } from './types'

export type PatchTriggerInput = {
  triggerEventId: string
} & components['schemas']['TriggersPatchRequest']

export type PatchTriggerResponse = Trigger

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
