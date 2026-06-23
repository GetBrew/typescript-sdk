import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { BrandLogosResponse } from './types'

export type { BrandLogosResponse }

/**
 * `GET /v1/brand/logos` — the brand's logo variants (light/dark,
 * icon/wordmark) hosted on the Brew CDN. Requires the `emails` scope.
 *
 * Returns `{ data }` — a small fixed set of logos (not paginated) ready to
 * drop straight into generated emails.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<BrandLogosResponse>` instead of the unwrapped payload.
 */
export function createGetBrandLogos(client: HttpClient) {
  function getLogos(
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<BrandLogosResponse>>
  function getLogos(options?: RequestOptions): Promise<BrandLogosResponse>
  async function getLogos(
    options?: RequestOptions
  ): Promise<BrandLogosResponse | BrewRawResponse<BrandLogosResponse>> {
    const response = await client.request<BrandLogosResponse>({
      method: 'GET',
      path: '/v1/brand/logos',
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getLogos
}
