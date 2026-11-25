import type { components } from '../../generated/openapi-types'
import type { PaginationInput } from '../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type ListBrandsResponse = components['schemas']['BrandsListResponse']

export type ListBrandsInput = PaginationInput & {
  readonly status?: 'extracting' | 'completed' | 'failed' | 'deleting'
}

export function createListBrands(client: HttpClient) {
  function listBrands(
    input: ListBrandsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListBrandsResponse>>
  function listBrands(
    input?: ListBrandsInput,
    options?: RequestOptions
  ): Promise<ListBrandsResponse>
  async function listBrands(
    input: ListBrandsInput = {},
    options?: RequestOptions
  ): Promise<ListBrandsResponse | BrewRawResponse<ListBrandsResponse>> {
    const response = await client.request<ListBrandsResponse>({
      method: 'GET',
      path: '/v1/brands',
      query: {
        status: input.status,
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listBrands
}
