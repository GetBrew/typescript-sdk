import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ContentGenerateImageRequest, ContentImageResponse } from './types'

export type { ContentGenerateImageRequest, ContentImageResponse }

export const GENERATE_IMAGE_DEFAULT_TIMEOUT_MS = 180_000

export function createGenerateImage(client: HttpClient) {
  function generateImage(
    input: ContentGenerateImageRequest,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ContentImageResponse>>
  function generateImage(
    input: ContentGenerateImageRequest,
    options?: RequestOptions
  ): Promise<ContentImageResponse>
  async function generateImage(
    input: ContentGenerateImageRequest,
    options?: RequestOptions
  ): Promise<ContentImageResponse | BrewRawResponse<ContentImageResponse>> {
    const response = await client.request<ContentImageResponse>({
      method: 'POST',
      path: '/v1/content/generate-image',
      body: input,
      defaultTimeoutMs: GENERATE_IMAGE_DEFAULT_TIMEOUT_MS,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return generateImage
}
