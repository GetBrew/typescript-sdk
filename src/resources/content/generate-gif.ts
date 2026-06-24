import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ContentGenerateGifRequest, ContentGifResponse } from './types'

export type { ContentGenerateGifRequest, ContentGifResponse }

/**
 * `POST /v1/content/generate-gif` — generate an animated GIF from a text
 * `prompt`. Requires the `emails` scope.
 *
 * Returns a `ContentGifResponse` (`{ gifUrl, videoUrl, altText,
 * duration, fps, aspectRatio, loop }`). This operation is credit-metered.
 * An insufficient balance surfaces as `402 INSUFFICIENT_CREDITS`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ContentGifResponse>` instead of the unwrapped
 * payload.
 */
export function createGenerateGif(client: HttpClient) {
  function generateGif(
    input: ContentGenerateGifRequest,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ContentGifResponse>>
  function generateGif(
    input: ContentGenerateGifRequest,
    options?: RequestOptions
  ): Promise<ContentGifResponse>
  async function generateGif(
    input: ContentGenerateGifRequest,
    options?: RequestOptions
  ): Promise<ContentGifResponse | BrewRawResponse<ContentGifResponse>> {
    const response = await client.request<ContentGifResponse>({
      method: 'POST',
      path: '/v1/content/generate-gif',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return generateGif
}
