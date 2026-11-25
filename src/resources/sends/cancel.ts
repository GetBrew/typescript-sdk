import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type SendCancelResponse = components['schemas']['SendCancelResponse']

export type SendCancelStatus = SendCancelResponse['status']

export function createCancel(client: HttpClient) {
  function cancel(
    sendId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<SendCancelResponse>>
  function cancel(
    sendId: string,
    options?: RequestOptions
  ): Promise<SendCancelResponse>
  async function cancel(
    sendId: string,
    options?: RequestOptions
  ): Promise<SendCancelResponse | BrewRawResponse<SendCancelResponse>> {
    const response = await client.request<SendCancelResponse>({
      method: 'POST',
      path: `/v1/sends/${encodeURIComponent(sendId)}/cancel`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return cancel
}
