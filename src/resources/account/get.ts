import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { AccountGetResponse } from './types'

export type { AccountGetResponse }

/**
 * `GET /v1/account` — billing snapshot for the organization behind the key.
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
 * `BrewRawResponse<AccountGetResponse>` instead of the unwrapped payload.
 */
export function createGetAccount(client: HttpClient) {
  function getAccount(
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<AccountGetResponse>>
  function getAccount(options?: RequestOptions): Promise<AccountGetResponse>
  async function getAccount(
    options?: RequestOptions
  ): Promise<AccountGetResponse | BrewRawResponse<AccountGetResponse>> {
    const response = await client.request<AccountGetResponse>({
      method: 'GET',
      path: '/v1/account',
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getAccount
}
