import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ContentTransformRequest, ContentTransformResponse } from './types'

export type { ContentTransformRequest, ContentTransformResponse }

/**
 * `POST /v1/content/transform` — re-encode or resize a hosted image. The
 * body is a discriminated union on `operation`:
 *
 * - `{ operation: 'optimize', imageUrl }` — re-encode the source image for
 *   email (smaller bytes, same dimensions).
 * - `{ operation: 'resize', imageUrl, width, height, prompt?, resolution?, outputFormat? }` —
 *   resize to a target `width` / `height`, optionally guided by a `prompt`
 *   and tuned by `resolution` / `outputFormat`.
 *
 * Requires the `emails` scope. Returns a `ContentTransformResponse`
 * (`{ url, width, height, aspectRatio?, bytes?, fallbackUsed? }`). This
 * operation is credit-metered. An insufficient balance surfaces as
 * `402 INSUFFICIENT_CREDITS`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ContentTransformResponse>` instead of the unwrapped
 * payload.
 */
export function createTransform(client: HttpClient) {
  function transform(
    input: ContentTransformRequest,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ContentTransformResponse>>
  function transform(
    input: ContentTransformRequest,
    options?: RequestOptions
  ): Promise<ContentTransformResponse>
  async function transform(
    input: ContentTransformRequest,
    options?: RequestOptions
  ): Promise<
    ContentTransformResponse | BrewRawResponse<ContentTransformResponse>
  > {
    const response = await client.request<ContentTransformResponse>({
      method: 'POST',
      path: '/v1/content/transform',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return transform
}
