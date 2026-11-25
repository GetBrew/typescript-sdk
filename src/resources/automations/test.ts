import { unwrapResponse, type HttpClient } from '../../core/http'
import type { components } from '../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type TestAutomationInput = {
  automationId: string
} & components['schemas']['AutomationTestRequest']

export type TestAutomationResponse =
  components['schemas']['AutomationRunStartedResponse']

export function createTestAutomation(client: HttpClient) {
  function testAutomation(
    input: TestAutomationInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<TestAutomationResponse>>
  function testAutomation(
    input: TestAutomationInput,
    options?: RequestOptions
  ): Promise<TestAutomationResponse>
  async function testAutomation(
    input: TestAutomationInput,
    options?: RequestOptions
  ): Promise<TestAutomationResponse | BrewRawResponse<TestAutomationResponse>> {
    const { automationId, ...body } = input
    const response = await client.request<TestAutomationResponse>({
      method: 'POST',
      path: `/v1/automations/${encodeURIComponent(automationId)}/test`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return testAutomation
}
