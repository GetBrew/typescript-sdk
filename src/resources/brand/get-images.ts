import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { BrandImagesResponse, ListBrandImagesInput } from './types'

export type { BrandImagesResponse, ListBrandImagesInput }

export function createGetBrandImages(client: HttpClient) {
  function getImages(
    input: ListBrandImagesInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<BrandImagesResponse>>
  function getImages(
    input?: ListBrandImagesInput,
    options?: RequestOptions
  ): Promise<BrandImagesResponse>
  async function getImages(
    input: ListBrandImagesInput = {},
    options?: RequestOptions
  ): Promise<BrandImagesResponse | BrewRawResponse<BrandImagesResponse>> {
    const response = await client.request<BrandImagesResponse>({
      method: 'GET',
      path: '/v1/brand/images',
      query: {
        q: input.q,
        kind: input.kind,
        sort: input.sort,
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getImages
}
