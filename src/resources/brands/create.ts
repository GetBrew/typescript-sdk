import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type CreateBrandResponse = components['schemas']['BrandsCreateResponse']

export type CreateBrandInput = components['schemas']['BrandsCreateRequest']

/**
 * `POST /v1/brands` (scope: `brands`) — create a brand and start extraction.
 *
 * ASYNCHRONOUS. Returns `201` immediately with `status: 'extracting'`; the
 * crawl takes 1–3 minutes. Poll `brands.get({ brandId })` until `ready` is
 * true BEFORE calling `emails.create(...)`, which returns `422
 * BRAND_NOT_READY` until then.
 *
 * Requires an ORGANIZATION-scoped key (`403 ORG_SCOPE_REQUIRED` otherwise) and
 * the `brands` scope, which is NOT implied by `emails`.
 *
 * Extraction requires a non-empty credit balance but is not itself charged to
 * your credits.
 *
 * ```ts
 * const { brand } = await brew.brands.create({ url: 'acme.com' })
 * let status = brand
 * while (!status.ready && status.status !== 'failed') {
 *   await new Promise((r) => setTimeout(r, 5_000))
 *   ;({ brand: status } = await brew.brands.get({ brandId: brand.brandId }))
 * }
 * const scoped = brew.withBrand(brand.brandId)
 * ```
 */
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
