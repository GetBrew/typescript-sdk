import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { UsageGetResponse } from './types'

export type { UsageGetResponse }

export function createGetUsage(client: HttpClient) {
  function getUsage(
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<UsageGetResponse>>
  function getUsage(options?: RequestOptions): Promise<UsageGetResponse>
  async function getUsage(
    options?: RequestOptions
  ): Promise<UsageGetResponse | BrewRawResponse<UsageGetResponse>> {
    const response = await client.request<UsageGetResponse>({
      method: 'GET',
      path: '/v1/usage',
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getUsage
}
