import type { components } from '../../generated/openapi-types'
import type { HttpClient } from '../../core/http'
import type { RequestOptions } from '../../types'

export type CreateBrandInput = components['schemas']['BrandsCreateRequest']
export type CreateBrandResponse = components['schemas']['BrandsCreateResponse']

/**
 * Create a brand from a website URL or bare domain.
 *
 * The Brew API waits for the first brand extraction phase to finish
 * before returning, so the returned `brandId` is immediately usable for
 * email generation.
 */
export function createCreateBrand(client: HttpClient) {
  return async (
    input: CreateBrandInput,
    options?: RequestOptions
  ): Promise<CreateBrandResponse> => {
    const response = await client.request<CreateBrandResponse>({
      method: 'POST',
      path: '/v1/brands',
      body: input,
      ...(options ? { options } : {}),
    })
    return response.data
  }
}
