import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { HealthResponse } from './types'

export type { HealthResponse }

export type GetHealthResponse = HealthResponse

/**
 * `GET /v1/health` — liveness probe. No auth and no rate limit: a public
 * surface a dependent service (e.g. the Brew MCP server) can poll to
 * confirm the API is up. Returns `{ status: 'ok', version }`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetHealthResponse>` instead of the unwrapped payload.
 */
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
