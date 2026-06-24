import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ContentGifRequest, ContentGifResponse } from './types'

export type { ContentGifRequest, ContentGifResponse }

/**
 * `POST /v1/content/gif` — produce an animated GIF. The body is a
 * discriminated union on `from`:
 *
 * - `{ from: 'prompt', prompt, duration?, fps?, aspectRatio?, loop? }` —
 *   generate from a text prompt.
 * - `{ from: 'image', imageUrl, prompt?, duration?, fps?, aspectRatio?, loop? }` —
 *   animate a source image.
 * - `{ from: 'video', videoUrl, fps?, width? }` — transcode a source video.
 *
 * Requires the `emails` scope. Returns a `ContentGifResponse` (`{ gifUrl,
 * videoUrl?, altText?, duration?, fps?, aspectRatio?, loop? }`). This
 * operation is credit-metered. An insufficient balance surfaces as
 * `402 INSUFFICIENT_CREDITS`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ContentGifResponse>` instead of the unwrapped payload.
 */
export function createGif(client: HttpClient) {
  function gif(
    input: ContentGifRequest,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ContentGifResponse>>
  function gif(
    input: ContentGifRequest,
    options?: RequestOptions
  ): Promise<ContentGifResponse>
  async function gif(
    input: ContentGifRequest,
    options?: RequestOptions
  ): Promise<ContentGifResponse | BrewRawResponse<ContentGifResponse>> {
    const response = await client.request<ContentGifResponse>({
      method: 'POST',
      path: '/v1/content/gif',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return gif
}
