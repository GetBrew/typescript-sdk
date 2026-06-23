import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { SendsTestRequest, SendsTestResponse } from './types'

/** Test-send body for `POST /v1/sends/test` — fires to a single `to` address. */
export type TestSendInput = SendsTestRequest
export type TestSendResponse = SendsTestResponse

/**
 * `POST /v1/sends/test` — fire a one-off [TEST] delivery of a design's
 * current (or pinned) body to a single caller-supplied address. Requires
 * the `sends` scope.
 *
 * Forces the Brew default sender (no verified domain or audience
 * required) and never creates a send row. Resolves synchronously
 * (HTTP 200) with `{ status: 'sent', recipient }`.
 *
 * Errors: `400` (missing `to` / invalid body), `404 EMAIL_NOT_FOUND`,
 * `422 EMAIL_NOT_READY`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<TestSendResponse>` instead of the unwrapped payload.
 */
export function createTestSend(client: HttpClient) {
  function testSend(
    input: TestSendInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<TestSendResponse>>
  function testSend(
    input: TestSendInput,
    options?: RequestOptions
  ): Promise<TestSendResponse>
  async function testSend(
    input: TestSendInput,
    options?: RequestOptions
  ): Promise<TestSendResponse | BrewRawResponse<TestSendResponse>> {
    const response = await client.request<TestSendResponse>({
      method: 'POST',
      path: '/v1/sends/test',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return testSend
}
