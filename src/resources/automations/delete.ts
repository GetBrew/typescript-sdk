import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type DeleteAutomationInput = { automationId: string }

export type DeleteAutomationResponse = {
  automationId: string
  deletedAutomations: number
  deletedEmails: number
  deletedEmailGroupings: number
  deletedCanvasLayouts: number
  deletedExecutions: number
  deletedExecutionLogs: number
}

/**
 * `DELETE /v1/automations` — cascade-delete. Idempotent (deleting
 * an already-deleted automation returns all zeros, not 404).
 */
export function createDeleteAutomation(client: HttpClient) {
  function deleteAutomation(
    input: DeleteAutomationInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<DeleteAutomationResponse>>
  function deleteAutomation(
    input: DeleteAutomationInput,
    options?: RequestOptions
  ): Promise<DeleteAutomationResponse>
  async function deleteAutomation(
    input: DeleteAutomationInput,
    options?: RequestOptions
  ): Promise<
    DeleteAutomationResponse | BrewRawResponse<DeleteAutomationResponse>
  > {
    const response = await client.request<DeleteAutomationResponse>({
      method: 'DELETE',
      path: '/v1/automations',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return deleteAutomation
}
