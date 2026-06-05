import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { BrandGetResponse } from './types'

export type { BrandGetResponse }

/**
 * `GET /v1/brand` — the brand bound to the API key, plus its extraction
 * readiness. Singleton (no list / no id): one API key maps to exactly
 * one brand. Requires the `emails` scope.
 *
 * Returns `{ brand }`. Read `brand.ready` (true ⇔ `status: 'completed'`)
 * before generating or sending — `POST /v1/emails` 422s
 * `BRAND_NOT_READY` until extraction completes. A `404 BRAND_NOT_FOUND`
 * means the bound brand was deleted.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<BrandGetResponse>` instead of the unwrapped payload.
 */
export function createGetBrand(client: HttpClient) {
  function getBrand(
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<BrandGetResponse>>
  function getBrand(options?: RequestOptions): Promise<BrandGetResponse>
  async function getBrand(
    options?: RequestOptions
  ): Promise<BrandGetResponse | BrewRawResponse<BrandGetResponse>> {
    const response = await client.request<BrandGetResponse>({
      method: 'GET',
      path: '/v1/brand',
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getBrand
}
