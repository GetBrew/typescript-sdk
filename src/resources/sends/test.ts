import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { SendsPostRequest, SendsTestResponse } from './types'

/**
 * Test-send body — the `mode: 'test'` branch of the `POST /v1/sends`
 * discriminated union, minus the literal `mode` (the method adds it).
 */
export type TestSendInput = Omit<
  Extract<SendsPostRequest, { mode: 'test' }>,
  'mode'
>
export type TestSendResponse = SendsTestResponse

/**
 * Send a one-off test/preview of a saved email to a single recipient.
 *
 * Forces the Brew default sender (no verified domain or audience
 * required) and does NOT consume the email's single live-send slot.
 * Resolves synchronously (HTTP 200) with `{ status: 'sent', recipient }`.
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
      path: '/v1/sends',
      body: { ...input, mode: 'test' },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return testSend
}
