import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ListSendsInput, SendsListResponse } from './types'

export type { ListSendsInput, SendsListResponse }

/**
 * `GET /v1/sends` — list the brand's campaign sends, newest first, with
 * their lifecycle status and aggregate `stats`. Brand-wide: there is no
 * `emailId` filter here — for one design's send history use
 * `brew.sends.listForEmail(...)`. Requires the `sends` scope.
 *
 * Filters: `status`, `from`/`to` (ISO-8601), plus `limit`/`cursor` for
 * pagination. Returns `{ data, pagination }`. To page through every
 * matching send without juggling the cursor, use `brew.sends.listAll`.
 *
 * For a single send by id, use `brew.sends.get(...)`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<SendsListResponse>` instead of the unwrapped
 * envelope.
 */
export function createListSends(client: HttpClient) {
  function listSends(
    input: ListSendsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<SendsListResponse>>
  function listSends(
    input?: ListSendsInput,
    options?: RequestOptions
  ): Promise<SendsListResponse>
  async function listSends(
    input: ListSendsInput = {},
    options?: RequestOptions
  ): Promise<SendsListResponse | BrewRawResponse<SendsListResponse>> {
    const response = await client.request<SendsListResponse>({
      method: 'GET',
      path: '/v1/sends',
      query: {
        status: input.status,
        from: input.from,
        to: input.to,
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listSends
}
