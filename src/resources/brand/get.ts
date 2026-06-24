import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { BrandGetResponse, BrandIncludeToken } from './types'

export type { BrandGetResponse, BrandIncludeToken }

/**
 * Options for `brew.brand.get`. Pass `include` to embed design context in
 * the same call — any subset of `identity` (structured brand facts),
 * `emailDesign` / `imageStyle` (the markdown design system the email
 * agent follows), and `logos` (the CDN logo set). Accepts either an array
 * (`['identity', 'logos']`) or a pre-joined comma string (`'identity,logos'`);
 * the SDK serializes it as the single comma-separated `?include=` value the
 * API expects.
 */
export type GetBrandInput = {
  readonly include?: ReadonlyArray<BrandIncludeToken> | string
}

/** Serialize the `include` option into the API's comma-separated form. */
function serializeInclude(
  include: GetBrandInput['include']
): string | undefined {
  if (include === undefined) return undefined
  const joined = typeof include === 'string' ? include : include.join(',')
  return joined.length > 0 ? joined : undefined
}

/**
 * `GET /v1/brand` — the brand bound to the API key, plus its extraction
 * readiness. Singleton (no list / no id): one API key maps to exactly
 * one brand. Requires the `emails` scope.
 *
 * Returns `{ brand }`. Pass `include` (e.g. `['identity', 'logos']`) to
 * embed any of `identity` / `emailDesign` / `imageStyle` / `logos` in the
 * same response. Read `brand.ready` (true ⇔ `status: 'completed'`)
 * before generating or sending — `POST /v1/emails` 422s
 * `BRAND_NOT_READY` until extraction completes. A `404 BRAND_NOT_FOUND`
 * means the bound brand was deleted.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<BrandGetResponse>` instead of the unwrapped payload.
 */
export function createGetBrand(client: HttpClient) {
  function getBrand(
    input: GetBrandInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<BrandGetResponse>>
  function getBrand(
    input?: GetBrandInput,
    options?: RequestOptions
  ): Promise<BrandGetResponse>
  async function getBrand(
    input: GetBrandInput = {},
    options?: RequestOptions
  ): Promise<BrandGetResponse | BrewRawResponse<BrandGetResponse>> {
    const response = await client.request<BrandGetResponse>({
      method: 'GET',
      path: '/v1/brand',
      query: { include: serializeInclude(input.include) },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getBrand
}
