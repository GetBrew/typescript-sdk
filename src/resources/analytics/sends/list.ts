import { autoPaginate } from '../../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { ListSendsInput, Send, SendsListResponse } from './types'

export type { ListSendsInput, SendsListResponse }

/**
 * `GET /v1/analytics/sends` — list the brand's campaign sends, newest
 * first, with their lifecycle status and aggregate `stats`. Brand-wide:
 * there is no `emailId` filter here — for one design's send history use
 * `brew.analytics.sends.listForEmail(...)`. Requires the `sends` scope.
 *
 * Filters: `status`, `from`/`to` (ISO-8601), plus `limit`/`cursor` for
 * pagination. Returns `{ data, pagination }`. To page through every
 * matching send without juggling the cursor, use
 * `brew.analytics.sends.listAll`.
 *
 * For a single send by id, use `brew.analytics.sends.get(...)`.
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
      path: '/v1/analytics/sends',
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

/**
 * Input to `brew.analytics.sends.listAll(...)`. Same filters as `list`
 * minus `cursor` — the iterator owns cursor state internally. `limit`
 * here is the per-page size, not a total cap; stop the `for await` loop
 * whenever you like.
 */
export type ListAllSendsInput = Readonly<Omit<ListSendsInput, 'cursor'>>

/**
 * Async iterator that pages through every matching send, yielding one
 * `Send` at a time. Follows `pagination.cursor` until `hasMore` is
 * `false`; honors `options.signal` between pages.
 *
 * ```ts
 * for await (const send of brew.analytics.sends.listAll({ status: 'sent' })) {
 *   console.log(send.emailId, send.stats?.delivered)
 * }
 * ```
 */
export function createListAllSends(client: HttpClient) {
  const list = createListSends(client)

  return function listAllSends(
    input: ListAllSendsInput = {},
    options?: RequestOptions
  ): AsyncGenerator<Send, void, void> {
    return autoPaginate<Send>(
      async (cursor) => {
        const pageInput: ListSendsInput = {
          ...input,
          ...(cursor !== null ? { cursor } : {}),
        }
        const response = await list(pageInput, options)
        return { items: response.data, pagination: response.pagination }
      },
      options?.signal ? { signal: options.signal } : undefined
    )
  }
}
