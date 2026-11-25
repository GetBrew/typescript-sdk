import type { RequestOptions } from '../types'

export type Pagination = {
  readonly limit: number
  readonly cursor: string | null
  readonly hasMore: boolean
}

export type PaginationInput = {
  readonly limit?: number
  readonly cursor?: string
}

export type Page<TItem> = {
  readonly items: ReadonlyArray<TItem>
  readonly pagination: Pagination | undefined
}

export class BrewPaginationError extends Error {
  readonly code = 'PAGINATION_CURSOR_CYCLE'
  readonly cursor: string
  readonly pagesFetched: number
  readonly itemsYielded: number

  constructor(input: {
    readonly cursor: string
    readonly pagesFetched: number
    readonly itemsYielded: number
  }) {
    super('Pagination returned a previously fetched cursor.')
    this.name = 'BrewPaginationError'
    this.cursor = input.cursor
    this.pagesFetched = input.pagesFetched
    this.itemsYielded = input.itemsYielded
  }
}

export async function* autoPaginate<TItem>(
  fetchPage: (cursor: string | null) => Promise<Page<TItem>>,
  options?: { readonly signal?: AbortSignal }
): AsyncGenerator<TItem, void, void> {
  /* eslint-disable no-await-in-loop --
   * Sequential awaits are the entire point: each page must come back
   * before its cursor is known, so the next fetch cannot start early.
   */
  let cursor: string | null = null
  const fetched = new Set<string>()
  let pagesFetched = 0
  let itemsYielded = 0
  const isAborted = () => options?.signal?.aborted === true
  while (true) {
    if (isAborted()) {
      return
    }

    const page = await fetchPage(cursor)
    pagesFetched += 1
    if (cursor !== null) {
      fetched.add(cursor)
    }
    for (const item of page.items) {
      itemsYielded += 1
      yield item
    }

    if (isAborted()) {
      return
    }

    const next = page.pagination
    if (!next || !next.hasMore || next.cursor === null) {
      return
    }

    if (fetched.has(next.cursor)) {
      throw new BrewPaginationError({
        cursor: next.cursor,
        pagesFetched,
        itemsYielded,
      })
    }

    cursor = next.cursor
  }
  /* eslint-enable no-await-in-loop */
}

export function pageReadOptions({
  options,
}: {
  readonly options: RequestOptions | undefined
}): RequestOptions | undefined {
  return options === undefined ? undefined : { ...options, raw: false }
}
