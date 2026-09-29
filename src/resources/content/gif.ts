import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ContentGifRequest, ContentGifResponse } from './types'

export type { ContentGifRequest, ContentGifResponse }

/**
 * Default per-call timeout for `POST /v1/content/gif`.
 *
 * A prompt- or image-to-GIF run is a video generation: healthy runs take
 * 37–125 s (production p95 ≈ 130 s) and the server allows up to 360 s. On
 * the 30 s client default most calls would time out while the server kept
 * working — and billed the GIF — and the retry would find the first attempt
 * still holding its idempotency key. 300 s is also the longest Node's
 * built-in `fetch` waits for a response (see `docs/configuration.md`).
 * Caller-supplied `RequestOptions.timeoutMs` and `RequestOptions.signal`
 * still win.
 *
 * It is a floor, never a cap: a longer client-wide `timeoutMs` is kept.
 */
export const GIF_DEFAULT_TIMEOUT_MS = 300_000

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
 * Long-running: the SDK applies a 5-minute default timeout
 * (`GIF_DEFAULT_TIMEOUT_MS`).
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
      defaultTimeoutMs: GIF_DEFAULT_TIMEOUT_MS,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return gif
}
