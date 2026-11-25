import { type HttpClient, unwrapResponse } from '../../../core/http'
import type { components } from '../../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../../types'

export type TriggerReadinessResponse = components['schemas']['TriggerReadiness']

export type TriggerReadinessBlocker =
  TriggerReadinessResponse['blockers'][number]

export type TriggerReadinessDelivery = NonNullable<
  TriggerReadinessResponse['delivery']
>

export function createTriggerReadiness(client: HttpClient) {
  function triggerReadiness(
    triggerEventId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<TriggerReadinessResponse>>
  function triggerReadiness(
    triggerEventId: string,
    options?: RequestOptions
  ): Promise<TriggerReadinessResponse>
  async function triggerReadiness(
    triggerEventId: string,
    options?: RequestOptions
  ): Promise<
    TriggerReadinessResponse | BrewRawResponse<TriggerReadinessResponse>
  > {
    const response = await client.request<TriggerReadinessResponse>({
      method: 'GET',
      path: `/v1/automations/triggers/${encodeURIComponent(triggerEventId)}/readiness`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return triggerReadiness
}
