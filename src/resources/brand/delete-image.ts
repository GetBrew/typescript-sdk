import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { BrandImageDeleteResponse } from './types'

export type { BrandImageDeleteResponse }

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
