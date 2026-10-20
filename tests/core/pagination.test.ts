import { describe, expect, it } from 'vitest'
import { BrewPaginationError } from '../../src'

import {
  autoPaginate,
  type Page,
  pageReadOptions,
} from '../../src/core/pagination'

describe('autoPaginate', () => {
  it.each([
    { cursors: ['a', 'a'], calls: [null, 'a'], itemsYielded: 2 },
    { cursors: ['a', 'b', 'a'], calls: [null, 'a', 'b'], itemsYielded: 3 },
  ])(
    'rejects a cursor cycle before refetching a known page',
    async ({ cursors, calls, itemsYielded }) => {
      const requested: Array<string | null> = []
      const yielded: Array<number> = []
      const drain = async () => {
        for await (const item of autoPaginate<number>((cursor) => {
          requested.push(cursor)
          // Bound the old implementation so the regression fails without hanging.
          if (requested.length > cursors.length) {
            return Promise.reject(new Error('refetched a known page'))
          }
          return Promise.resolve({
            items: [requested.length],
            pagination: {
              limit: 1,
              cursor: cursors[requested.length - 1]!,
              hasMore: true,
            },
          })
        })) {
          yielded.push(item)
        }
      }
      const error = await drain().catch((caught: unknown) => caught)
      expect(error).toBeInstanceOf(BrewPaginationError)
      expect(error).toMatchObject({
        code: 'PAGINATION_CURSOR_CYCLE',
        cursor: 'a',
        pagesFetched: calls.length,
        itemsYielded,
      })
      expect(requested).toEqual(calls)
      expect(yielded.length).toBe(itemsYielded)
    }
  )

  it('advances through an empty page and accepts a terminal cursor that was seen earlier', async () => {
    const cursors: Array<string | null> = []
    const output: Array<number> = []
    for await (const item of autoPaginate<number>((cursor) => {
      cursors.push(cursor)
      return Promise.resolve(
        cursor === null
          ? { items: [], pagination: { limit: 1, cursor: 'a', hasMore: true } }
          : {
              items: [7],
              pagination: { limit: 1, cursor: 'a', hasMore: false },
            }
      )
    })) {
      output.push(item)
    }
    expect(output).toEqual([7])
    expect(cursors).toEqual([null, 'a'])
  })

  it('yields every row across pages, following the cursor', async () => {
    const pages: Record<string, Page<number>> = {
      first: {
        items: [1, 2],
        pagination: { limit: 2, cursor: 'b', hasMore: true },
      },
      b: { items: [3], pagination: { limit: 2, cursor: null, hasMore: false } },
    }
    const seen: Array<string | null> = []

    const out: Array<number> = []
    for await (const n of autoPaginate<number>((cursor) => {
      seen.push(cursor)
      return Promise.resolve(pages[cursor ?? 'first']!)
    })) {
      out.push(n)
    }

    expect(out).toEqual([1, 2, 3])
    expect(seen).toEqual([null, 'b'])
  })

  it('stops after a single-fetch page with no pagination envelope', async () => {
    const out: Array<number> = []
    for await (const n of autoPaginate<number>(() =>
      Promise.resolve({ items: [42], pagination: undefined })
    )) {
      out.push(n)
    }
    expect(out).toEqual([42])
  })

  it('stops fetching new pages once the signal is aborted', async () => {
    const controller = new AbortController()
    let calls = 0

    const out: Array<number> = []
    for await (const n of autoPaginate<number>(
      () => {
        calls += 1
        return Promise.resolve({
          items: [calls],
          pagination: { limit: 1, cursor: 'next', hasMore: true },
        })
      },
      { signal: controller.signal }
    )) {
      out.push(n)
      controller.abort()
    }

    expect(calls).toBe(1)
    expect(out).toEqual([1])
  })

  it('finishes the fetched page and stops quietly when an abort coincides with a cursor cycle', async () => {
    const controller = new AbortController()
    const requested: Array<string | null> = []
    const output: Array<number> = []

    for await (const item of autoPaginate<number>(
      (cursor) => {
        requested.push(cursor)
        return Promise.resolve({
          items: cursor === null ? [1] : [2, 3],
          pagination: { limit: 2, cursor: 'a', hasMore: true },
        })
      },
      { signal: controller.signal }
    )) {
      output.push(item)
      if (item === 2) {
        controller.abort()
      }
    }

    expect(requested).toEqual([null, 'a'])
    expect(output).toEqual([1, 2, 3])
  })
})

describe('pageReadOptions', () => {
  it('forces raw: false and keeps every other option', () => {
    const controller = new AbortController()
    expect(
      pageReadOptions({
        options: {
          raw: true,
          timeoutMs: 5_000,
          maxRetries: 1,
          signal: controller.signal,
        },
      })
    ).toEqual({
      raw: false,
      timeoutMs: 5_000,
      maxRetries: 1,
      signal: controller.signal,
    })
  })

  it('returns undefined for no options, so a read takes the client defaults', () => {
    expect(pageReadOptions({ options: undefined })).toBeUndefined()
  })

  it('does not mutate the caller options', () => {
    const options = { raw: true } as const
    pageReadOptions({ options })
    expect(options).toEqual({ raw: true })
  })
})
