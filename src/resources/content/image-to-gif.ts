import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type {
  ContentImageToGifRequest,
  ContentImageToGifResponse,
} from './types'

export type { ContentImageToGifRequest, ContentImageToGifResponse }

/**
 * `POST /v1/content/image-to-gif` — animate a source `imageUrl` into a
 * GIF, optionally guided by a motion `prompt`. Requires the `emails`
 * scope.
 *
 * Returns the GIF payload (`{ gifUrl, videoUrl, altText, duration, fps,
 * aspectRatio, loop }`). This operation is credit-metered. An
 * insufficient balance surfaces as `402 INSUFFICIENT_CREDITS`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ContentImageToGifResponse>` instead of the unwrapped
 * payload.
 */
export function createImageToGif(client: HttpClient) {
  function imageToGif(
    input: ContentImageToGifRequest,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ContentImageToGifResponse>>
  function imageToGif(
    input: ContentImageToGifRequest,
    options?: RequestOptions
  ): Promise<ContentImageToGifResponse>
  async function imageToGif(
    input: ContentImageToGifRequest,
    options?: RequestOptions
  ): Promise<
    ContentImageToGifResponse | BrewRawResponse<ContentImageToGifResponse>
  > {
    const response = await client.request<ContentImageToGifResponse>({
      method: 'POST',
      path: '/v1/content/image-to-gif',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return imageToGif
}
