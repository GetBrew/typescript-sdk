import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { MeGetResponse } from './types'

export type { MeGetResponse }

/**
 * `GET /v1/me` — identity behind the current credential. Scope-agnostic:
 * any valid key (or session) is accepted, regardless of granted scopes.
 *
 * Returns `{ authType, orgId, brandId, scopes }`:
 * - `authType` — `api_key` for API keys, `session` for cookie auth.
 * - `orgId` — the organization the credential belongs to.
 * - `brandId` — the brand the credential is scoped to.
 * - `scopes` — the scopes granted to this credential.
 *
 * Useful as a cheap credential check: it never 403s on scope, so a 200
 * confirms the key is valid and reveals exactly what it can do.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<MeGetResponse>` instead of the unwrapped payload.
 */
export function createGetMe(client: HttpClient) {
  function getMe(
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<MeGetResponse>>
  function getMe(options?: RequestOptions): Promise<MeGetResponse>
  async function getMe(
    options?: RequestOptions
  ): Promise<MeGetResponse | BrewRawResponse<MeGetResponse>> {
    const response = await client.request<MeGetResponse>({
      method: 'GET',
      path: '/v1/me',
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getMe
}
