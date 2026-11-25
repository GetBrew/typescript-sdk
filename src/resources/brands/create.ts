import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type CreateBrandResponse = components['schemas']['BrandsCreateResponse']

export type CreateBrandInput = components['schemas']['BrandsCreateRequest']

export function createCreateBrand(client: HttpClient) {
  function createBrand(
    input: CreateBrandInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<CreateBrandResponse>>
  function createBrand(
    input: CreateBrandInput,
    options?: RequestOptions
  ): Promise<CreateBrandResponse>
  async function createBrand(
    input: CreateBrandInput,
    options?: RequestOptions
  ): Promise<CreateBrandResponse | BrewRawResponse<CreateBrandResponse>> {
    const response = await client.request<CreateBrandResponse>({
      method: 'POST',
      path: '/v1/brands',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return createBrand
}
