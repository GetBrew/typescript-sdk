import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type SendPauseResponse = components['schemas']['SendPauseResponse']

export function createPause(client: HttpClient) {
  function pause(
    sendId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<SendPauseResponse>>
  function pause(
    sendId: string,
    options?: RequestOptions
  ): Promise<SendPauseResponse>
  async function pause(
    sendId: string,
    options?: RequestOptions
  ): Promise<SendPauseResponse | BrewRawResponse<SendPauseResponse>> {
    const response = await client.request<SendPauseResponse>({
      method: 'POST',
      path: `/v1/sends/${encodeURIComponent(sendId)}/pause`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return pause
}
