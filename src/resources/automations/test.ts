import { unwrapResponse, type HttpClient } from '../../core/http'
import type { components } from '../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../types'

/** Body for `automations.test()` plus the `automationId` path identity. */
export type TestAutomationInput = {
  automationId: string
} & components['schemas']['AutomationTestRequest']

/** `{ automationRunIds, status: 'test_started', receivedAt }`. */
export type TestAutomationResponse =
  components['schemas']['AutomationRunStartedResponse']

/**
 * `POST /v1/automations/{automationId}/test` (scope: `automations`) — start a
 * TEST run of the saved automation. Omit `testRecipient` for a dry run that
 * delivers nothing. Set it to deliver every send node's email for real to that
 * inbox. Test redirects skip the live contact suppression gate. Verified
 * configured sender domains are preserved; otherwise delivery uses the Brew
 * test domain. Real test deliveries count toward send usage; dry runs do not.
 * Test runs never count against analytics rollups. The optional `payload` must
 * match the trigger's schema.
 *
 * Pass `scenario` to simulate engagement (opens and clicks after a delay) and
 * force split branches; the response's `testMode` is then `'scenario'`.
 *
 * Returns `202` with `{ automationRunIds, status: 'test_started', testMode }` —
 * follow a run via `brew.automations.runs.get(automationRunId, { include:
 * 'logs' })`; a test run's detail carries `testCoverage` (the nodes,
 * connections and decisions it exercised).
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<TestAutomationResponse>` instead of the unwrapped payload.
 */
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
