import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { UsageGetResponse } from './types'

export type { UsageGetResponse }

/**
 * `GET /v1/usage` — API usage for the organization behind the key.
 * Requires the `emails` scope.
 *
 * Returns `{ usage }` with three views:
 * - `usage.overview` — rolling 24h totals (`requests`, `successRate`
 *   0–100, `errors`, `rateLimited`).
 * - `usage.trend` — 30 daily points (`date`, `requests`, `errors`).
 * - `usage.routes` — per-route rollup over the last 7 days
 *   (`route`, `requests`, `successRate`, `topErrorCode`).
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<UsageGetResponse>` instead of the unwrapped payload.
 */
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
