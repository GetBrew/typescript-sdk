import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { UsageGetResponse } from './types'

export type { UsageGetResponse }

/**
 * `GET /v1/usage` — billing snapshot for the organization behind the key.
 * Requires the `emails` scope.
 *
 * Returns `{ plan, credits, emailSends, period }`:
 * - `plan` — the current plan (`key`, `name`).
 * - `credits` — credit allotment for the period (`limit` nullable for
 *   unlimited, `used`, `remaining` nullable).
 * - `emailSends` — email-send allotment for the period (same shape as
 *   `credits`).
 * - `period` — the billing window these counters cover (`start`/`end`,
 *   both nullable ISO date-time strings).
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
