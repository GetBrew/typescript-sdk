import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type {
  ContentHostImageRequest,
  ContentHostedImageResponse,
} from './types'

export type { ContentHostImageRequest, ContentHostedImageResponse }

/**
 * `POST /v1/content/host-image` — mirror a source `imageUrl` onto
 * Brew-hosted storage and return the stable hosted url. Requires the
 * `emails` scope.
 *
 * Returns a `ContentHostedImageResponse` (`{ url }`). This operation is
 * credit-metered. An insufficient balance surfaces
 * as `402 INSUFFICIENT_CREDITS`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ContentHostedImageResponse>` instead of the unwrapped
 * payload.
 */
export function createHostImage(client: HttpClient) {
  function hostImage(
    input: ContentHostImageRequest,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ContentHostedImageResponse>>
  function hostImage(
    input: ContentHostImageRequest,
    options?: RequestOptions
  ): Promise<ContentHostedImageResponse>
  async function hostImage(
    input: ContentHostImageRequest,
    options?: RequestOptions
  ): Promise<
    ContentHostedImageResponse | BrewRawResponse<ContentHostedImageResponse>
  > {
    const response = await client.request<ContentHostedImageResponse>({
      method: 'POST',
      path: '/v1/content/host-image',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return hostImage
}
