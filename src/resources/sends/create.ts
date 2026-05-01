import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type CreateSendInput = components['schemas']['SendsPostRequest']
export type CreateSendResponse = components['schemas']['SendsPostResponse']

/**
 * Start an async send for an existing saved email.
 *
 * This resolves when the API accepts the job for queueing or scheduling.
 * It does not wait for final delivery.
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
