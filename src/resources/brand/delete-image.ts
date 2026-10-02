import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { BrandImageDeleteResponse } from './types'

export type { BrandImageDeleteResponse }

/**
 * `DELETE /v1/brand/images/{assetId}` — remove ONE image from the brand
 * library and from image search, as Delete image on the Assets page does.
 * Requires the `emails` scope. Free; no credits are charged.
 *
 * `assetId` is the 8-character id a `brew.brand.getImages()` row carries.
 * The image's file stays hosted at its URL, so emails already using it
 * keep rendering; it is only no longer offered for new designs.
 *
 * Returns `{ assetId, deleted }`. An id not in the library resolves
 * `deleted: false` and changes nothing, so repeating the call is safe (and
 * a DELETE retries on transient failures). A logo, or a malformed
 * `assetId`, is `400 INVALID_REQUEST`: logos are managed on the Assets
 * page in Brew.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<BrandImageDeleteResponse>` instead of the unwrapped
 * payload.
 */
export function createDeleteBrandImage(client: HttpClient) {
  function deleteImage(
    assetId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<BrandImageDeleteResponse>>
  function deleteImage(
    assetId: string,
    options?: RequestOptions
  ): Promise<BrandImageDeleteResponse>
  async function deleteImage(
    assetId: string,
    options?: RequestOptions
  ): Promise<
    BrandImageDeleteResponse | BrewRawResponse<BrandImageDeleteResponse>
  > {
    const response = await client.request<BrandImageDeleteResponse>({
      method: 'DELETE',
      path: `/v1/brand/images/${encodeURIComponent(assetId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return deleteImage
}
