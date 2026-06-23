import { autoPaginate } from '../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type {
  ListEmailSendsInput,
  Send,
  SendsListResponse,
} from './types'

export type { ListEmailSendsInput, SendsListResponse }

/**
 * Input to `brew.sends.listForEmail(...)`. The `emailId` is sent on the
 * URL path; the rest mirror the `GET /v1/sends` filters (`status`,
 * `from`/`to`, `limit`/`cursor`).
 */
export type ListSendsForEmailInput = ListEmailSendsInput & {
  /**
   * The design whose send history to page through. Cross-brand or
   * unknown ids surface as `404 EMAIL_NOT_FOUND` from the server.
   */
  readonly emailId: string
}

/**
 * `GET /v1/emails/{emailId}/sends` — list one design's send history,
 * newest first, under `{ data, pagination }`. A design can be sent
 * unlimited times and each campaign send is its own `Send` row. 404s on
 * an unknown design so an empty history is distinguishable from a bad
 * id. Requires the `sends` scope.
 *
 * Same filters as `brew.sends.list(...)` (`status`, `from`/`to`) plus
 * `limit`/`cursor`. To page through every send use
 * `brew.sends.listAllForEmail`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<SendsListResponse>` instead of the unwrapped
 * envelope.
 */
export function createListSendsForEmail(client: HttpClient) {
  function listSendsForEmail(
    input: ListSendsForEmailInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<SendsListResponse>>
  function listSendsForEmail(
    input: ListSendsForEmailInput,
    options?: RequestOptions
  ): Promise<SendsListResponse>
  async function listSendsForEmail(
    input: ListSendsForEmailInput,
    options?: RequestOptions
  ): Promise<SendsListResponse | BrewRawResponse<SendsListResponse>> {
    const { emailId, ...query } = input
    const response = await client.request<SendsListResponse>({
      method: 'GET',
      path: `/v1/emails/${encodeURIComponent(emailId)}/sends`,
      query: {
        status: query.status,
        from: query.from,
        to: query.to,
        limit: query.limit,
        cursor: query.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listSendsForEmail
}

/**
 * Input to `brew.sends.listAllForEmail(...)`. Same as
 * `ListSendsForEmailInput` minus `cursor` — the iterator owns cursor
 * state internally. `limit` is the per-page size, not a total cap.
 */
export type ListAllSendsForEmailInput = Readonly<
  Omit<ListSendsForEmailInput, 'cursor'>
>

/**
 * Async iterator over `GET /v1/emails/{emailId}/sends` that pages
 * through every send of one design, yielding one `Send` at a time.
 * Follows `pagination.cursor` until `hasMore` is `false`; honors
 * `options.signal` between pages.
 *
 * ```ts
 * for await (const send of brew.sends.listAllForEmail({ emailId: 'eml_x' })) {
 *   console.log(send.sendId, send.stats?.delivered)
 * }
 * ```
 */
export function createListAllSendsForEmail(client: HttpClient) {
  const list = createListSendsForEmail(client)

  return function listAllSendsForEmail(
    input: ListAllSendsForEmailInput,
    options?: RequestOptions
  ): AsyncGenerator<Send, void, void> {
    return autoPaginate<Send>(
      async (cursor) => {
        const pageInput: ListSendsForEmailInput = {
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
