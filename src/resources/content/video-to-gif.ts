import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type {
  ContentVideoToGifRequest,
  ContentVideoToGifResponse,
} from './types'

export type { ContentVideoToGifRequest, ContentVideoToGifResponse }

/**
 * `POST /v1/content/video-to-gif` — transcode a source `videoUrl` into a
 * GIF at an optional `fps` / `width`. Requires the `emails` scope.
 *
 * Returns a `ContentVideoToGifResponse` (`{ gifUrl }`). This operation
 * is credit-metered. Pass `dry_run: true` on the input to preview the
 * cost without transcoding — the server then spends nothing and returns
 * a credit-cost preview envelope instead. An insufficient balance
 * surfaces as `402 INSUFFICIENT_CREDITS`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ContentVideoToGifResponse>` instead of the unwrapped
 * payload.
 */
export function createVideoToGif(client: HttpClient) {
  function videoToGif(
    input: ContentVideoToGifRequest,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ContentVideoToGifResponse>>
  function videoToGif(
    input: ContentVideoToGifRequest,
    options?: RequestOptions
  ): Promise<ContentVideoToGifResponse>
  async function videoToGif(
    input: ContentVideoToGifRequest,
    options?: RequestOptions
  ): Promise<
    ContentVideoToGifResponse | BrewRawResponse<ContentVideoToGifResponse>
  > {
    const response = await client.request<ContentVideoToGifResponse>({
      method: 'POST',
      path: '/v1/content/video-to-gif',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return videoToGif
}
