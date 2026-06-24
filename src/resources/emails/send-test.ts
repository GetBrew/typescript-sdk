import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/** Body for `POST /v1/sends/test` — a one-off [TEST] delivery. */
export type SendsTestRequest = components['schemas']['SendsTestRequest']

/** 200 envelope for a `POST /v1/sends/test` delivery. */
export type SendsTestResponse = components['schemas']['SendsTestResponse']

/** Test-send body for `POST /v1/sends/test` — fires to a single `to` address. */
export type SendTestInput = SendsTestRequest
export type SendTestResponse = SendsTestResponse

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
 * `BrewRawResponse<SendTestResponse>` instead of the unwrapped payload.
 */
export function createSendTestEmail(client: HttpClient) {
  function sendTestEmail(
    input: SendTestInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<SendTestResponse>>
  function sendTestEmail(
    input: SendTestInput,
    options?: RequestOptions
  ): Promise<SendTestResponse>
  async function sendTestEmail(
    input: SendTestInput,
    options?: RequestOptions
  ): Promise<SendTestResponse | BrewRawResponse<SendTestResponse>> {
    const response = await client.request<SendTestResponse>({
      method: 'POST',
      path: '/v1/sends/test',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return sendTestEmail
}
