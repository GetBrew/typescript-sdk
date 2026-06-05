import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { SendAcceptedResponse, SendsPostRequest } from './types'

/**
 * Campaign-send body — the non-`test` branch of the `POST /v1/sends`
 * discriminated union. For a one-off preview use `brew.sends.test(...)`.
 */
export type CreateSendInput = Exclude<SendsPostRequest, { mode: 'test' }>
export type CreateSendResponse = SendAcceptedResponse

/**
 * Start an async campaign send for an existing saved email.
 *
 * This resolves when the API accepts the job for queueing or scheduling
 * (HTTP 202). It does not wait for final delivery — poll
 * `brew.sends.get(emailId)` for lifecycle + stats.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<CreateSendResponse>` instead of the unwrapped
 * payload.
 */
export function createCreateSend(client: HttpClient) {
  function createSend(
    input: CreateSendInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<CreateSendResponse>>
  function createSend(
    input: CreateSendInput,
    options?: RequestOptions
  ): Promise<CreateSendResponse>
  async function createSend(
    input: CreateSendInput,
    options?: RequestOptions
  ): Promise<CreateSendResponse | BrewRawResponse<CreateSendResponse>> {
    const response = await client.request<CreateSendResponse>({
      method: 'POST',
      path: '/v1/sends',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return createSend
}
