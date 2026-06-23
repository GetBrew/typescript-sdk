import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { BrandImageStyleResponse } from './types'

export type { BrandImageStyleResponse }

/**
 * `GET /v1/brand/image-style` — the brand's `image-style.md`, the art
 * direction `POST /v1/emails` follows when generating imagery. Requires
 * the `emails` scope.
 *
 * Returns `{ markdown }` — the markdown for color, motif, and mood of
 * generated images (empty string if unset). Read it to understand or steer
 * the look; replace it with `updateImageStyle`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<BrandImageStyleResponse>` instead of the unwrapped
 * payload.
 */
export function createGetBrandImageStyle(client: HttpClient) {
  function getImageStyle(
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<BrandImageStyleResponse>>
  function getImageStyle(
    options?: RequestOptions
  ): Promise<BrandImageStyleResponse>
  async function getImageStyle(
    options?: RequestOptions
  ): Promise<BrandImageStyleResponse | BrewRawResponse<BrandImageStyleResponse>> {
    const response = await client.request<BrandImageStyleResponse>({
      method: 'GET',
      path: '/v1/brand/image-style',
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getImageStyle
}
