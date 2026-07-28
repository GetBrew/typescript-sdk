import type { components } from '../../generated/openapi-types'
import type { PaginationInput } from '../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type ListBrandsResponse = components['schemas']['BrandsListResponse']

/** Input to `brew.brands.list(...)`. */
export type ListBrandsInput = PaginationInput & {
  /** Narrow to one lifecycle state (e.g. `'completed'` for usable brands). */
  readonly status?: 'extracting' | 'completed' | 'failed' | 'deleting'
}

/**
 * `GET /v1/brands` (scope: `emails`) — the brands this key can reach.
 *
 * ORGANIZATION-LEVEL: it resolves no brand, so it takes no `X-Brand-Id`. This
 * is how an organization-scoped key discovers the ids it passes to
 * `client.withBrand(...)` on every other call. A brand-scoped key sees exactly
 * the one brand it is bound to, so the same call answers "which brand am I?"
 * for any key.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ListBrandsResponse>` instead of the unwrapped envelope.
 */
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
