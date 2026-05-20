import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type DeleteTriggerInput = { triggerEventId: string }

export type DeleteTriggerResponse = {
  triggerEventId: string
  deletedAt: string
  deletedRows: number
}

/**
 * `DELETE /v1/triggers` — destructive. Refuses with HTTP 409 +
 * `TRIGGER_HAS_DEPENDENT_AUTOMATIONS` when any non-archived automation
 * still references the trigger. Detach automations first, then retry.
 */
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
      path: '/v1/triggers',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return deleteTrigger
}
