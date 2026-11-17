import { readdirSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'

import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { type BrewClient, createBrewClient } from '../../src/index'
import { server } from '../msw/server'

/**
 * Every auto-pager reads its pages with the method it wraps. A caller's
 * `{ raw: true }` must not reach those reads: the page would come back as a
 * `BrewRawResponse` and the iterator would walk the wrong object (or throw).
 * Each iterator is driven with `raw: true` through two pages here.
 */

const BASE = 'https://brew.new/api'

function client(): BrewClient {
  return createBrewClient(
    { apiKey: 'brew_test_abc', baseUrl: BASE, maxRetries: 0 },
    { sleep: () => Promise.resolve() }
  )
}

/** Two pages of `{ marker }` rows, keyed by whether a cursor was sent. */
function pageFor(cursor: string | null | undefined) {
  return cursor === null || cursor === undefined
    ? {
        data: [{ marker: 'a' }, { marker: 'b' }],
        pagination: { limit: 2, cursor: 'page_2', hasMore: true },
      }
    : {
        data: [{ marker: 'c' }],
        pagination: { limit: 2, cursor: null, hasMore: false },
      }
}

type Iterator = {
  readonly name: string
  readonly handler: (
    seen: Array<string | null>
  ) => Parameters<typeof server.use>[0]
  readonly walk: (brew: BrewClient) => AsyncGenerator<unknown, void, void>
}

function getHandler(path: string): Iterator['handler'] {
  return (seen) =>
    http.get(`${BASE}${path}`, ({ request }) => {
      const cursor = new URL(request.url).searchParams.get('cursor')
      seen.push(cursor)
      return HttpResponse.json(pageFor(cursor))
    })
}

const RAW = { raw: true } as const

const ITERATORS: ReadonlyArray<Iterator> = [
  {
    name: 'contacts.searchAll',
    handler: (seen) =>
      http.post(`${BASE}/v1/contacts/search`, async ({ request }) => {
        const body = (await request.json()) as { cursor?: string }
        seen.push(body.cursor ?? null)
        return HttpResponse.json(pageFor(body.cursor))
      }),
    walk: (brew) => brew.contacts.searchAll({}, RAW),
  },
  {
    name: 'sends.listAll',
    handler: getHandler('/v1/sends'),
    walk: (brew) => brew.sends.listAll({}, RAW),
  },
  {
    name: 'analytics.eventsAll',
    handler: getHandler('/v1/analytics/events'),
    walk: (brew) => brew.analytics.eventsAll({}, RAW),
  },
  {
    name: 'automations.triggerInstances.listAll',
    handler: getHandler('/v1/automations/trigger-instances'),
    walk: (brew) => brew.automations.triggerInstances.listAll({}, RAW),
  },
  {
    name: 'chats.listAll',
    handler: getHandler('/v1/chats'),
    walk: (brew) => brew.chats.listAll({}, RAW),
  },
  {
    name: 'notifications.listAll',
    handler: getHandler('/v1/notifications'),
    walk: (brew) => brew.notifications.listAll({}, RAW),
  },
]

describe('auto-pagers ignore { raw: true }', () => {
  for (const iterator of ITERATORS) {
    it(`${iterator.name} still yields rows and walks every page`, async () => {
      const seen: Array<string | null> = []
      server.use(iterator.handler(seen))

      const markers: Array<unknown> = []
      for await (const row of iterator.walk(client())) {
        markers.push((row as { marker: string }).marker)
      }

      expect(markers).toEqual(['a', 'b', 'c'])
      expect(seen).toEqual([null, 'page_2'])
    })
  }

  it('emails.comments.listAllMessages still walks the messagesCursor', async () => {
    const seen: Array<string | null> = []
    server.use(
      http.get(`${BASE}/v1/emails/:emailId/comments`, ({ request }) => {
        const messagesCursor = new URL(request.url).searchParams.get(
          'messagesCursor'
        )
        seen.push(messagesCursor)
        const isFirst = messagesCursor === null
        return HttpResponse.json({
          data: [
            {
              commentId: 'cmt_1',
              messages: isFirst
                ? [{ messageId: 'cmm_2' }, { messageId: 'cmm_3' }]
                : [{ messageId: 'cmm_1' }],
              messagesCursor: isFirst ? 'older_1' : null,
            },
          ],
          pagination: { limit: 100, cursor: null, hasMore: false },
        })
      })
    )

    const ids: Array<string> = []
    for await (const message of client().emails.comments.listAllMessages(
      { emailId: 'eml_1', commentId: 'cmt_1' },
      RAW
    )) {
      ids.push(message.messageId)
    }

    expect(ids).toEqual(['cmm_3', 'cmm_2', 'cmm_1'])
    expect(seen).toEqual([null, 'older_1'])
  })
})

describe('every auto-pager reads its pages unwrapped', () => {
  function sources(directory: string): Array<string> {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return sources(path)
      return extname(entry.name) === '.ts' ? [path] : []
    })
  }

  it('passes pageReadOptions(...) wherever it calls autoPaginate', () => {
    const files = sources(join(process.cwd(), 'src/resources')).filter((file) =>
      readFileSync(file, 'utf8').includes('autoPaginate<')
    )
    // One file per iterator above (comments' listAllMessages included).
    expect(files).toHaveLength(ITERATORS.length + 1)
    const unguarded = files.filter(
      (file) => !readFileSync(file, 'utf8').includes('pageReadOptions(')
    )
    expect(unguarded).toEqual([])
  })
})
