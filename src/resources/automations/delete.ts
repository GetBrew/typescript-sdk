import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type DeleteAutomationInput = { automationId: string }

/**
 * Cascade-delete result. `deleted` is `true` when a row was removed and
 * `false` for an idempotent no-op (already deleted), alongside the
 * per-table counts.
 */
export type DeleteAutomationResponse =
  components['schemas']['AutomationsDeleteResponse']

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
