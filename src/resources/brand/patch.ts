import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { BrandPatchResponse, UpdateBrandInput } from './types'

export type { BrandPatchResponse, UpdateBrandInput }

export function createUpdateBrand(client: HttpClient) {
  function updateBrand(
    input: UpdateBrandInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<BrandPatchResponse>>
  function updateBrand(
    input: UpdateBrandInput,
    options?: RequestOptions
  ): Promise<BrandPatchResponse>
  async function updateBrand(
    input: UpdateBrandInput,
    options?: RequestOptions
  ): Promise<BrandPatchResponse | BrewRawResponse<BrandPatchResponse>> {
    const response = await client.request<BrandPatchResponse>({
      method: 'PATCH',
      path: '/v1/brand',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return updateBrand
}
