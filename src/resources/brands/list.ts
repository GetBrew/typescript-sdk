import type { components } from '../../generated/openapi-types'
import type { HttpClient } from '../../core/http'

export type ListBrandsResponse = components['schemas']['BrandsListResponse']

/**
 * List completed brands that are ready to use as `brandId` input when
 * generating emails.
 */
export function createListBrands(client: HttpClient) {
  return async (): Promise<ListBrandsResponse> => {
    const response = await client.request<ListBrandsResponse>({
      method: 'GET',
      path: '/v1/brands',
    })
    return response.data
  }
}
