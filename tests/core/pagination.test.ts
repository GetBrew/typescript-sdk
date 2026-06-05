import { describe, expect, it } from 'vitest'

import { autoPaginate, type Page } from '../../src/core/pagination'

describe('autoPaginate', () => {
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
})
