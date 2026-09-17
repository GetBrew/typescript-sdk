import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { TriggerInstance } from './types'

/** `GET /v1/automations/trigger-instances/{triggerInstanceId}` returns the BARE row. */
export type GetTriggerInstanceResponse = TriggerInstance

/**
 * `GET /v1/automations/trigger-instances/{triggerInstanceId}` (scope:
 * `automations`) — one fired-trigger instance, returned as the BARE row:
 * where the fire came from, which automations it matched, which runs it
 * started, and why it was rejected if it was.
 *
 * An unknown or cross-brand id is `404 TRIGGER_INSTANCE_NOT_FOUND` (the
 * code that replaced `EVENT_NOT_FOUND`) — it is no longer an empty page
 * you have to test for.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetTriggerInstanceResponse>` instead of the unwrapped
 * row.
 */
export function createGetTriggerInstance(client: HttpClient) {
  function getTriggerInstance(
    triggerInstanceId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetTriggerInstanceResponse>>
  function getTriggerInstance(
    triggerInstanceId: string,
    options?: RequestOptions
  ): Promise<GetTriggerInstanceResponse>
  async function getTriggerInstance(
    triggerInstanceId: string,
    options?: RequestOptions
  ): Promise<
    GetTriggerInstanceResponse | BrewRawResponse<GetTriggerInstanceResponse>
  > {
    const response = await client.request<GetTriggerInstanceResponse>({
      method: 'GET',
      path: `/v1/automations/trigger-instances/${encodeURIComponent(triggerInstanceId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getTriggerInstance
}
