import { type HttpClient, unwrapResponse } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ApiKeysListResponse } from './types'

export type { ApiKeysListResponse }

/**
 * `GET /v1/api-keys` — list API keys in the organization. A brand-scoped
 * credential only sees keys bound to its own brand. Organization-level
 * — takes no `X-Brand-Id`. No permission scope.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ApiKeysListResponse>` instead of the unwrapped
 * payload.
 */
export function createListApiKeys(client: HttpClient) {
  function listApiKeys(
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ApiKeysListResponse>>
  function listApiKeys(options?: RequestOptions): Promise<ApiKeysListResponse>
  async function listApiKeys(
    options?: RequestOptions
  ): Promise<ApiKeysListResponse | BrewRawResponse<ApiKeysListResponse>> {
    const response = await client.request<ApiKeysListResponse>({
      method: 'GET',
      path: '/v1/api-keys',
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listApiKeys
}
