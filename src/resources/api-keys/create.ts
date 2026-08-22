import { type HttpClient, unwrapResponse } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { CreateApiKeyInput, CreateApiKeyResponse } from './types'

export type { CreateApiKeyInput, CreateApiKeyResponse }

/**
 * `POST /v1/api-keys` — mint a new API key. No permission scope, but an
 * organization-wide key (an omitted body `brandId`) requires an
 * org-admin dashboard session or an organization-scoped credential.
 * `permissions` defaults to `["all"]` and cannot exceed the caller's own
 * grant.
 *
 * Returns `201` with `{ key, keyId, message }` — `key` is the plaintext
 * secret, shown exactly once. Store it immediately; `GET /v1/api-keys`
 * only ever exposes the redacted `keyPreview` afterward.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<CreateApiKeyResponse>` instead of the unwrapped
 * payload.
 */
export function createCreateApiKey(client: HttpClient) {
  function createApiKey(
    input: CreateApiKeyInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<CreateApiKeyResponse>>
  function createApiKey(
    input: CreateApiKeyInput,
    options?: RequestOptions
  ): Promise<CreateApiKeyResponse>
  async function createApiKey(
    input: CreateApiKeyInput,
    options?: RequestOptions
  ): Promise<CreateApiKeyResponse | BrewRawResponse<CreateApiKeyResponse>> {
    const response = await client.request<CreateApiKeyResponse>({
      method: 'POST',
      path: '/v1/api-keys',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return createApiKey
}
