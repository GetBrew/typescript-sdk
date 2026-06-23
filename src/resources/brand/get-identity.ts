import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { BrandIdentity } from './types'

export type { BrandIdentity }

/**
 * `GET /v1/brand/identity` — the brand's structured identity: name,
 * description, tagline, contact details, and social/content links.
 * Requires the `emails` scope.
 *
 * These are the text facts an agent can quote in generated copy. Update
 * one or more fields with `updateIdentity`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<BrandIdentity>` instead of the unwrapped payload.
 */
export function createGetBrandIdentity(client: HttpClient) {
  function getIdentity(
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<BrandIdentity>>
  function getIdentity(options?: RequestOptions): Promise<BrandIdentity>
  async function getIdentity(
    options?: RequestOptions
  ): Promise<BrandIdentity | BrewRawResponse<BrandIdentity>> {
    const response = await client.request<BrandIdentity>({
      method: 'GET',
      path: '/v1/brand/identity',
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getIdentity
}
