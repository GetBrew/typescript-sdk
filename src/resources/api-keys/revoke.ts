import { type HttpClient, unwrapResponse } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { RevokeApiKeyInput, RevokeApiKeyResponse } from './types'

export type { RevokeApiKeyInput, RevokeApiKeyResponse }

/**
 * `DELETE /v1/api-keys/{keyId}` — revoke an API key. No permission
 * scope, but an organization-wide key requires an org-admin dashboard
 * session or an organization-scoped credential. A brand credential
 * cannot see or revoke another brand's keys (`404`).
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<RevokeApiKeyResponse>` instead of the unwrapped
 * payload.
 */
export function createRevokeApiKey(client: HttpClient) {
  function revokeApiKey(
    input: RevokeApiKeyInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<RevokeApiKeyResponse>>
  function revokeApiKey(
    input: RevokeApiKeyInput,
    options?: RequestOptions
  ): Promise<RevokeApiKeyResponse>
  async function revokeApiKey(
    input: RevokeApiKeyInput,
    options?: RequestOptions
  ): Promise<RevokeApiKeyResponse | BrewRawResponse<RevokeApiKeyResponse>> {
    const response = await client.request<RevokeApiKeyResponse>({
      method: 'DELETE',
      path: `/v1/api-keys/${encodeURIComponent(input.keyId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return revokeApiKey
}
