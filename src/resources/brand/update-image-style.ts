import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type {
  BrandImageStyleResponse,
  UpdateBrandImageStyleInput,
} from './types'

export type { BrandImageStyleResponse, UpdateBrandImageStyleInput }

/**
 * `PUT /v1/brand/image-style` — replace the entire `image-style.md`
 * markdown for the key's brand. Requires the `emails` scope.
 *
 * Pass `{ markdown }`; the whole document is overwritten (not merged).
 * Returns the saved `{ markdown }`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<BrandImageStyleResponse>` instead of the unwrapped
 * payload.
 */
export function createUpdateBrandImageStyle(client: HttpClient) {
  function updateImageStyle(
    input: UpdateBrandImageStyleInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<BrandImageStyleResponse>>
  function updateImageStyle(
    input: UpdateBrandImageStyleInput,
    options?: RequestOptions
  ): Promise<BrandImageStyleResponse>
  async function updateImageStyle(
    input: UpdateBrandImageStyleInput,
    options?: RequestOptions
  ): Promise<BrandImageStyleResponse | BrewRawResponse<BrandImageStyleResponse>> {
    const response = await client.request<BrandImageStyleResponse>({
      method: 'PUT',
      path: '/v1/brand/image-style',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return updateImageStyle
}
