import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type {
  ContentOptimizeImageRequest,
  ContentOptimizedImageResponse,
} from './types'

export type { ContentOptimizeImageRequest, ContentOptimizedImageResponse }

/**
 * `POST /v1/content/optimize-image` — re-encode a source `imageUrl` into
 * an email-optimized asset. Requires the `emails` scope.
 *
 * Returns a `ContentOptimizedImageResponse` (`{ url, width, height,
 * aspectRatio, bytes }`). This operation is credit-metered. Pass
 * `dry_run: true` on the input to preview the cost without optimizing —
 * the server then spends nothing and returns a credit-cost preview
 * envelope instead. An insufficient balance surfaces as
 * `402 INSUFFICIENT_CREDITS`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ContentOptimizedImageResponse>` instead of the
 * unwrapped payload.
 */
export function createOptimizeImage(client: HttpClient) {
  function optimizeImage(
    input: ContentOptimizeImageRequest,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ContentOptimizedImageResponse>>
  function optimizeImage(
    input: ContentOptimizeImageRequest,
    options?: RequestOptions
  ): Promise<ContentOptimizedImageResponse>
  async function optimizeImage(
    input: ContentOptimizeImageRequest,
    options?: RequestOptions
  ): Promise<
    ContentOptimizedImageResponse | BrewRawResponse<ContentOptimizedImageResponse>
  > {
    const response = await client.request<ContentOptimizedImageResponse>({
      method: 'POST',
      path: '/v1/content/optimize-image',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return optimizeImage
}
