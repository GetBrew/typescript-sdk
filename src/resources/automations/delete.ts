import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type DeleteAutomationInput = { automationId: string }

export type DeleteAutomationResponse =
  components['schemas']['AutomationsDeleteResponse']

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
      path: `/v1/automations/${encodeURIComponent(input.automationId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return deleteAutomation
}
