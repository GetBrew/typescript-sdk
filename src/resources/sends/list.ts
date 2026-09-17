import { autoPaginate } from '../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ListSendsInput, Send, SendsListResponse } from './types'

export type { ListSendsInput, SendsListResponse }

/**
 * `GET /v1/sends` (scope: `sends`) — every send the brand has made,
 * newest first, under the uniform `{ data, pagination }` envelope.
 *
 * This is the read that replaced both `analytics.campaigns` and
 * `analytics.sends.list`: campaign KPIs are just
 * `list({ kind: 'campaign' })` — each row already carries its aggregate
 * `stats`.
 *
 * Filter with `kind` (`campaign` | `automation`), `emailId`,
 * `messageClass`, the automation provenance ids (`automationId`,
 * `automationRunId`, `audienceRunId`, `triggerInstanceId`), `status`,
 * and the `from` / `to` ISO-8601 window; page with `limit` / `cursor`.
 * `status` accepts only the v1 vocabulary (`scheduled | queued | running
 * | paused | completed | partially_completed | failed | canceled`) — the
 * old `sent` / `sending` spellings now `400`.
 *
 * A single send is `brew.sends.get(sendId)`; there is no `sendId` filter
 * here any more. To page through every match without juggling the cursor
 * use `brew.sends.listAll`.
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
        emailId: input.emailId,
        kind: input.kind,
        automationId: input.automationId,
        automationRunId: input.automationRunId,
        audienceRunId: input.audienceRunId,
        triggerInstanceId: input.triggerInstanceId,
        status: input.status,
        messageClass: input.messageClass,
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
 * Input to `brew.sends.listAll(...)`. Same filters as `list` minus
 * `cursor` — the iterator owns cursor state. `limit` here is the
 * per-page size, not a total cap; stop the `for await` loop whenever you
 * like.
 */
export type ListAllSendsInput = Readonly<Omit<ListSendsInput, 'cursor'>>

/**
 * Async iterator that pages through every matching send, yielding one
 * `Send` at a time. Follows `pagination.cursor` until `hasMore` is
 * `false`; honors `options.signal` between pages.
 *
 * ```ts
 * for await (const send of brew.sends.listAll({ kind: 'campaign' })) {
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
