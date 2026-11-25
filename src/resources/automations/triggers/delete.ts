import type { components } from '../../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

export type DeleteTriggerInput = { triggerEventId: string }

export type DeleteTriggerResponse =
  components['schemas']['TriggersDeleteResponse']

export function createDeleteTrigger(client: HttpClient) {
  function deleteTrigger(
    input: DeleteTriggerInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<DeleteTriggerResponse>>
  function deleteTrigger(
    input: DeleteTriggerInput,
    options?: RequestOptions
  ): Promise<DeleteTriggerResponse>
  async function deleteTrigger(
    input: DeleteTriggerInput,
    options?: RequestOptions
  ): Promise<DeleteTriggerResponse | BrewRawResponse<DeleteTriggerResponse>> {
    const response = await client.request<DeleteTriggerResponse>({
      method: 'DELETE',
      path: `/v1/automations/triggers/${encodeURIComponent(input.triggerEventId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return deleteTrigger
}
