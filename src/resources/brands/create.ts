import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type CreateBrandResponse = components['schemas']['BrandsCreateResponse']

export type CreateBrandInput = components['schemas']['BrandsCreateRequest']

/**
 * `POST /v1/brands` (scope: `brands`) — create a brand and start extraction.
 *
 * ASYNCHRONOUS. Returns `201` immediately with `status: 'extracting'`; the
 * crawl takes 1–3 minutes. Use `brands.waitForExtraction(brandId)` and check
 * `ready` BEFORE calling `emails.generate(...)`, which returns `422
 * BRAND_NOT_READY` until then.
 *
 * Requires an ORGANIZATION-scoped key (`403 ORG_SCOPE_REQUIRED` otherwise) and
 * the `brands` scope, which is NOT implied by `emails`.
 *
 * Extraction requires a non-empty credit balance but is not itself charged to
 * your credits.
 *
 * ```ts
 * const created = await brew.brands.create({ url: 'acme.com' })
 * const brand = await brew.brands.waitForExtraction(created.brandId)
 * if (!brand.ready) throw new Error(brand.error ?? 'Brand extraction failed')
 * const scoped = brew.withBrand(created.brandId)
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
