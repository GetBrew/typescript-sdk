import type { components } from '../../generated/openapi-types'
import type { HttpClient } from '../../core/http'
import type { RequestOptions } from '../../types'

export type CreateSendInput = components['schemas']['SendsPostRequest']
export type CreateSendResponse = components['schemas']['SendsPostResponse']

/**
 * Start an async send for an existing saved email.
 *
 * This resolves when the API accepts the job for queueing or scheduling.
 * It does not wait for final delivery.
 */
export function createCreateSend(client: HttpClient) {
  return async (
    input: CreateSendInput,
    options?: RequestOptions
  ): Promise<CreateSendResponse> => {
    const response = await client.request<CreateSendResponse>({
      method: 'POST',
      path: '/v1/sends',
      body: input,
      ...(options ? { options } : {}),
    })
    return response.data
  }
}
