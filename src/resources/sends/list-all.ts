import { autoPaginate } from '../../core/pagination'
import type { HttpClient } from '../../core/http'
import type { RequestOptions } from '../../types'

import { createListSends } from './list'
import type { ListSendsInput, Send } from './types'

/**
 * Input to `brew.sends.listAll(...)`. Same filters as `list` minus
 * `cursor` — the iterator owns cursor state internally. `limit` here is
 * the per-page size, not a total cap; stop the `for await` loop whenever
 * you like.
 */
export type ListAllSendsInput = Readonly<Omit<ListSendsInput, 'cursor'>>

/**
 * Async iterator that pages through every matching send, yielding one
 * `Send` at a time. Follows `pagination.cursor` until `hasMore` is
 * `false`; honors `options.signal` between pages.
 *
 * ```ts
 * for await (const send of brew.sends.listAll({ status: 'sent' })) {
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
        return { items: response.sends, pagination: response.pagination }
      },
      options?.signal ? { signal: options.signal } : undefined
    )
  }
}
