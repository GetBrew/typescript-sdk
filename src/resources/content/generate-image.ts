import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ContentGenerateImageRequest, ContentImageResponse } from './types'

export type { ContentGenerateImageRequest, ContentImageResponse }

/**
 * Default per-call timeout for `POST /v1/content/generate-image`.
 *
 * The server gives one model call up to 90 s (75 s for an edit), falls back
 * to a second model when the first fails, then stores the result — well past
 * the 30 s client default, which would time out while the server kept
 * working and billed the image. Caller-supplied `RequestOptions.timeoutMs`
 * and `RequestOptions.signal` still win.
 */
export const GENERATE_IMAGE_DEFAULT_TIMEOUT_MS = 180_000

/**
 * `POST /v1/content/generate-image` — generate an image from a text
 * `prompt` (optionally editing one or two source images). Requires the
 * `emails` scope.
 *
 * Returns a `ContentImageResponse` (`{ url, prompt, description?,
 * warnings? }`). The image is also saved to the brand's generated images
 * (`brand.getImages({ kind: 'generated' })`). This operation is
 * credit-metered. An
 * insufficient balance surfaces as `402 INSUFFICIENT_CREDITS`.
 *
 * Long-running: the SDK applies a 3-minute default timeout
 * (`GENERATE_IMAGE_DEFAULT_TIMEOUT_MS`).
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
    const resolvedOptions: RequestOptions = {
      ...(options ?? {}),
      timeoutMs: options?.timeoutMs ?? GENERATE_IMAGE_DEFAULT_TIMEOUT_MS,
    }
    const response = await client.request<ContentImageResponse>({
      method: 'POST',
      path: '/v1/content/generate-image',
      body: input,
      options: resolvedOptions,
    })
    return unwrapResponse(response, resolvedOptions)
  }
  return generateImage
}
