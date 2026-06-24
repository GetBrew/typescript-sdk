import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ContentResizeRequest, ContentResizeResponse } from './types'

export type { ContentResizeRequest, ContentResizeResponse }

/**
 * `POST /v1/content/resize` — resize a source `imageUrl` to a target
 * `width` / `height`, optionally guided by a `prompt` and tuned by
 * `resolution` / `outputFormat`. Requires the `emails` scope.
 *
 * Returns a `ContentResizeResponse` (`{ url, width, height,
 * fallbackUsed? }`). This operation is credit-metered. An insufficient
 * balance surfaces as `402 INSUFFICIENT_CREDITS`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ContentResizeResponse>` instead of the unwrapped
 * payload.
 */
export function createResize(client: HttpClient) {
  function resize(
    input: ContentResizeRequest,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ContentResizeResponse>>
  function resize(
    input: ContentResizeRequest,
    options?: RequestOptions
  ): Promise<ContentResizeResponse>
  async function resize(
    input: ContentResizeRequest,
    options?: RequestOptions
  ): Promise<ContentResizeResponse | BrewRawResponse<ContentResizeResponse>> {
    const response = await client.request<ContentResizeResponse>({
      method: 'POST',
      path: '/v1/content/resize',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return resize
}
