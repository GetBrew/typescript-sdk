import { type HttpClient, unwrapResponse } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { CreateApiKeyInput, CreateApiKeyResponse } from './types'

export type { CreateApiKeyInput, CreateApiKeyResponse }

/**
 * @deprecated
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
