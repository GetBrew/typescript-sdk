import { unwrapResponse, type HttpClient } from '../../core/http'
import { serializeInclude } from '../../core/url'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { BrandGetResponse, BrandIncludeToken } from './types'

export type { BrandGetResponse, BrandIncludeToken }

export type GetBrandInput = {
  readonly include?: ReadonlyArray<BrandIncludeToken> | string
}

export function createGetBrand(client: HttpClient) {
  function getBrand(
    input: GetBrandInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<BrandGetResponse>>
  function getBrand(
    input?: GetBrandInput,
    options?: RequestOptions
  ): Promise<BrandGetResponse>
  async function getBrand(
    input: GetBrandInput = {},
    options?: RequestOptions
  ): Promise<BrandGetResponse | BrewRawResponse<BrandGetResponse>> {
    const response = await client.request<BrandGetResponse>({
      method: 'GET',
      path: '/v1/brand',
      query: { include: serializeInclude({ include: input.include }) },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getBrand
}
