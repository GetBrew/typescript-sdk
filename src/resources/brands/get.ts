import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type GetBrandStatusResponse =
  components['schemas']['BrandGetByIdResponse']

export type GetBrandStatusInput = {
  readonly brandId: string
}

/**
 * `GET /v1/brands/{brandId}` (scope: `emails`) — one brand's LIFECYCLE state.
 *
 * The poll for `brands.create(...)`: reports `status`, `progress` and `phase`
 * while extraction runs, `error` if it failed, and `ready: true` once the brand
 * can be used to design email. Terminal states are `completed` and `failed`.
 *
 * For the brand's DESIGN CONTEXT (identity, design system, logos) use
 * `brew.brand.get(...)` instead — that one reads the brand the request acts on.
 *
 * An unknown brand, one in another organization, and one being deleted are all
 * `404 BRAND_NOT_FOUND` — deliberately indistinguishable.
 */
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
      path: '/v1/brands/{brandId}',
      pathParams: { brandId: input.brandId },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getBrand
}
