/**
 * Shared cursor-pagination primitives.
 *
 * Every `/v1/*` list endpoint returns a uniform envelope alongside its
 * resource array:
 *
 *   { "<resource>": [ ... ], "pagination": { limit, cursor, hasMore } }
 *
 * `cursor` is an opaque base64url token — never construct it by hand.
 * It is `null` on the last page, so the loop condition is
 * `while (pagination.cursor !== null)`.
 */

export type Pagination = {
  readonly limit: number
  readonly cursor: string | null
  readonly hasMore: boolean
}

/**
 * The cursor knobs every list method accepts. `limit` is the per-page
 * size (1–100, default 100); `cursor` echoes back the prior page's
 * `pagination.cursor`.
 */
export type PaginationInput = {
  readonly limit?: number
  readonly cursor?: string
}

/**
 * One page handed to {@link autoPaginate}: the rows plus the pagination
 * envelope. `pagination` is `undefined` for single-fetch responses (an
 * id lookup returns a one-element array without an envelope) — those
 * terminate the iterator after the first page.
 */
export type Page<TItem> = {
  readonly items: ReadonlyArray<TItem>
  readonly pagination: Pagination | undefined
}

/**
 * Generic async-iterator that walks every page of a cursor-paginated
 * list, yielding one row at a time. Resources build a thin `listAll`
 * wrapper around this so callers never juggle cursor state:
 *
 * ```ts
 * for await (const send of brew.analytics.sends.listAll({ status: 'sent' })) {
 *   console.log(send.emailId)
 * }
 * ```
 *
 * `fetchPage` is called once per page with the cursor for that page
 * (`null` for the first). It must return `{ items, pagination }`.
 * Iteration stops when `pagination` is absent, `hasMore` is `false`, or
 * `cursor` is `null`. The optional `signal` is checked between pages, so
 * an abort halts further fetches (rows already returned from the last
 * `fetchPage` are still yielded by the loop body).
 */
export async function* autoPaginate<TItem>(
  fetchPage: (cursor: string | null) => Promise<Page<TItem>>,
  options?: { readonly signal?: AbortSignal }
): AsyncGenerator<TItem, void, void> {
  /* eslint-disable no-await-in-loop --
   * Sequential awaits are the entire point: each page must come back
   * before its cursor is known, so the next fetch cannot start early.
   */
  let cursor: string | null = null
  while (true) {
    if (options?.signal?.aborted === true) {
      return
    }

    const page = await fetchPage(cursor)
    for (const item of page.items) {
      yield item
    }

    const next = page.pagination
    if (!next || !next.hasMore || next.cursor === null) {
      return
    }

    cursor = next.cursor
  }
  /* eslint-enable no-await-in-loop */
}
