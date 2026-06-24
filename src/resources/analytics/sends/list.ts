import { autoPaginate } from '../../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { ListSendsInput, Send, SendsListResponse } from './types'

export type { ListSendsInput, SendsListResponse }

/**
 * `GET /v1/analytics/sends` (scope: `sends`) — the single sends read,
 * under the uniform `{ data, pagination? }` envelope. Reads are flat:
 * the identity lives in the query.
 *
 * - List mode (no `sendId`): the brand's sends, newest first, with
 *   lifecycle status and aggregate `stats`. Narrow to one design's
 *   history with `emailId` (mutually exclusive with `sendId`). Filter
 *   with `status`, `from` / `to` (ISO-8601); page with `limit` /
 *   `cursor`.
 * - Detail mode (`sendId` set): a single-row page `{ data: [row] }` with
 *   no `pagination`. Add `include: 'events'` for a bounded first page of
 *   the send's per-recipient analytics events inlined on the row (an
 *   `include` without `sendId` is `400 INVALID_REQUEST`).
 *
 * To page through every matching send without juggling the cursor, use
 * `brew.analytics.sends.listAll`.
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
        sendId: input.sendId,
        emailId: input.emailId,
        include: input.include,
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
 * minus `cursor` (the iterator owns cursor state) and the detail-only
 * `sendId` / `include` knobs (paging a single row is meaningless).
 * `limit` here is the per-page size, not a total cap; stop the
 * `for await` loop whenever you like.
 */
export type ListAllSendsInput = Readonly<
  Omit<ListSendsInput, 'cursor' | 'sendId' | 'include'>
>

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
