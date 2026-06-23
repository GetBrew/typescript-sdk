import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { BrandIdentity, UpdateBrandIdentityInput } from './types'

export type { BrandIdentity, UpdateBrandIdentityInput }

/**
 * `PATCH /v1/brand/identity` — shallow-merge one or more identity fields
 * on the key's brand. Requires the `emails` scope.
 *
 * Only the provided fields change; everything else is preserved. Returns
 * the full merged `BrandIdentity`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<BrandIdentity>` instead of the unwrapped payload.
 */
export function createUpdateBrandIdentity(client: HttpClient) {
  function updateIdentity(
    input: UpdateBrandIdentityInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<BrandIdentity>>
  function updateIdentity(
    input: UpdateBrandIdentityInput,
    options?: RequestOptions
  ): Promise<BrandIdentity>
  async function updateIdentity(
    input: UpdateBrandIdentityInput,
    options?: RequestOptions
  ): Promise<BrandIdentity | BrewRawResponse<BrandIdentity>> {
    const response = await client.request<BrandIdentity>({
      method: 'PATCH',
      path: '/v1/brand/identity',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return updateIdentity
}
