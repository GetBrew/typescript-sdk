import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { HealthResponse } from './types'

export type { HealthResponse }

export type GetHealthResponse = HealthResponse

export function createGetHealth(client: HttpClient) {
  function getHealth(
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetHealthResponse>>
  function getHealth(options?: RequestOptions): Promise<GetHealthResponse>
  async function getHealth(
    options?: RequestOptions
  ): Promise<GetHealthResponse | BrewRawResponse<GetHealthResponse>> {
    const response = await client.request<GetHealthResponse>({
      method: 'GET',
      path: '/v1/health',
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getHealth
}
