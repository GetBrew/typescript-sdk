import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { BrandPatchResponse, UpdateBrandInput } from './types'

export type { BrandPatchResponse, UpdateBrandInput }

/**
 * `PATCH /v1/brand` — update the bound brand's design context. Supply at
 * least one of:
 *
 * - `identity` — structured brand facts; the given keys are
 *   **shallow-merged** onto the stored identity (everything else is
 *   preserved).
 * - `emailDesign` — the `email-design.md` markdown document (replaces the
 *   whole document).
 * - `imageStyle` — the `image-style.md` markdown document (replaces the
 *   whole document).
 *
 * Requires the `emails` scope. Returns the same `{ brand, ... }` envelope
 * as `GET /v1/brand`, echoing only the touched fields.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<BrandPatchResponse>` instead of the unwrapped payload.
 */
export function createUpdateBrand(client: HttpClient) {
  function updateBrand(
    input: UpdateBrandInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<BrandPatchResponse>>
  function updateBrand(
    input: UpdateBrandInput,
    options?: RequestOptions
  ): Promise<BrandPatchResponse>
  async function updateBrand(
    input: UpdateBrandInput,
    options?: RequestOptions
  ): Promise<BrandPatchResponse | BrewRawResponse<BrandPatchResponse>> {
    const response = await client.request<BrandPatchResponse>({
      method: 'PATCH',
      path: '/v1/brand',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return updateBrand
}
