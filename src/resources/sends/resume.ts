import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type SendResumeResponse = components['schemas']['SendResumeResponse']

export function createResume(client: HttpClient) {
  function resume(
    sendId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<SendResumeResponse>>
  function resume(
    sendId: string,
    options?: RequestOptions
  ): Promise<SendResumeResponse>
  async function resume(
    sendId: string,
    options?: RequestOptions
  ): Promise<SendResumeResponse | BrewRawResponse<SendResumeResponse>> {
    const response = await client.request<SendResumeResponse>({
      method: 'POST',
      path: `/v1/sends/${encodeURIComponent(sendId)}/resume`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return resume
}
