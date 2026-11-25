import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { TriggerInstance } from './types'

export type GetTriggerInstanceResponse = TriggerInstance

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
