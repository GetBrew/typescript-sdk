import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ContentAddImageRequest, ContentAddImageResponse } from './types'

export type { ContentAddImageRequest, ContentAddImageResponse }

/**
 * `POST /v1/content/add-image` — mirror a source `imageUrl` onto
 * Brew-hosted storage and return the stable hosted url. Requires the
 * `emails` scope.
 *
 * Returns a `ContentAddImageResponse` (`{ url }`). This operation is
 * credit-metered. An insufficient balance surfaces
 * as `402 INSUFFICIENT_CREDITS`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ContentAddImageResponse>` instead of the unwrapped
 * payload.
 */
export function createAddImage(client: HttpClient) {
  function addImage(
    input: ContentAddImageRequest,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ContentAddImageResponse>>
  function addImage(
    input: ContentAddImageRequest,
    options?: RequestOptions
  ): Promise<ContentAddImageResponse>
  async function addImage(
    input: ContentAddImageRequest,
    options?: RequestOptions
  ): Promise<
    ContentAddImageResponse | BrewRawResponse<ContentAddImageResponse>
  > {
    const response = await client.request<ContentAddImageResponse>({
      method: 'POST',
      path: '/v1/content/add-image',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return addImage
}
