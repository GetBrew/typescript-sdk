import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type {
  ContentGenerateImageRequest,
  ContentImageResponse,
} from './types'

export type { ContentGenerateImageRequest, ContentImageResponse }

/**
 * `POST /v1/content/generate-image` — generate an image from a text
 * `prompt` (optionally editing one or two source images). Requires the
 * `emails` scope.
 *
 * Returns a `ContentImageResponse` (`{ url, prompt, description?,
 * warnings? }`). This operation is credit-metered. An
 * insufficient balance surfaces as `402 INSUFFICIENT_CREDITS`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ContentImageResponse>` instead of the unwrapped
 * payload.
 */
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
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return generateImage
}
