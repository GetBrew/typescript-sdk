import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type GetBrandStatusResponse =
  components['schemas']['BrandGetByIdResponse']

export type GetBrandStatusInput = {
  readonly brandId: string
}

export function createGetBrand(client: HttpClient) {
  function getBrand(
    input: GetBrandStatusInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetBrandStatusResponse>>
  function getBrand(
    input: GetBrandStatusInput,
    options?: RequestOptions
  ): Promise<GetBrandStatusResponse>
  async function getBrand(
    input: GetBrandStatusInput,
    options?: RequestOptions
  ): Promise<GetBrandStatusResponse | BrewRawResponse<GetBrandStatusResponse>> {
    const response = await client.request<GetBrandStatusResponse>({
      method: 'GET',
      path: `/v1/brands/${encodeURIComponent(input.brandId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getBrand
}
