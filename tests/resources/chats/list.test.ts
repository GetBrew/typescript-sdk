import { http, HttpResponse } from 'msw'
import { describe, expect, expectTypeOf, it } from 'vitest'

import type { ChatSummary, ListChatsInput } from '../../../src/index'
import { createChatsResource } from '../../../src/resources/chats/resource'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

function chat(chatId: string, overrides: Record<string, unknown> = {}) {
  return {
    chatId,
    title: 'Spring launch campaign',
    firstUserPrompt: 'Draft a launch email for the spring collection',
    lastAssistantPreview: 'Updated the hero and added a "Shop now" button.',
    status: 'completed',
    origin: null,
    updatedAt: '2026-06-30T12:34:56.789Z',
    url: `https://brew.new/chat/${chatId}`,
    ...overrides,
  }
}

describe('chats.list', () => {
  it('GETs /v1/chats with no query by default and returns { data, pagination }', async () => {
    let url: URL | undefined
    server.use(
      http.get('https://brew.new/api/v1/chats', ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json({
          data: [
            chat('Hk2mZ8t9QbY3sW1vR0pLd'),
            chat('Zq9', { title: null, status: null, origin: 'slack' }),
          ],
          pagination: { limit: 100, cursor: null, hasMore: false },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const page = await createChatsResource(client).list()

    expect(url?.pathname).toBe('/api/v1/chats')
    expect(url?.search).toBe('')
    expect(page.data[0]?.chatId).toBe('Hk2mZ8t9QbY3sW1vR0pLd')
    expect(page.data[0]?.status).toBe('completed')
    // Nullable fields round-trip as null.
    expect(page.data[1]?.title).toBeNull()
    expect(page.data[1]?.status).toBeNull()
    expect(page.data[1]?.origin).toBe('slack')
  })

  it('forwards limit and an opaque native cursor verbatim', async () => {
    // Native cursors run up to 8,192 characters and are not base64url.
    const cursor = `${'x'.repeat(4000)}+/=`
    let params: URLSearchParams | undefined
    server.use(
      http.get('https://brew.new/api/v1/chats', ({ request }) => {
        params = new URL(request.url).searchParams
        return HttpResponse.json({
          data: [],
          pagination: { limit: 25, cursor: null, hasMore: false },
        })
      })
    )

    const { client } = makeTestHttpClient()
    await createChatsResource(client).list({ limit: 25, cursor })

    expect(params?.get('limit')).toBe('25')
    expect(params?.get('cursor')).toBe(cursor)
  })

  it('returns the full BrewRawResponse with { raw: true }', async () => {
    server.use(
      http.get('https://brew.new/api/v1/chats', () =>
        HttpResponse.json(
          {
            data: [chat('c1')],
            pagination: { limit: 100, cursor: null, hasMore: false },
          },
          { headers: { 'x-request-id': 'req_chats' } }
        )
      )
    )

    const { client } = makeTestHttpClient()
    const raw = await createChatsResource(client).list(undefined, {
      raw: true,
    })

    expect(raw.requestId).toBe('req_chats')
    expect(raw.data.data[0]?.chatId).toBe('c1')
  })

  it('surfaces a malformed cursor as 400 INVALID_REQUEST', async () => {
    server.use(
      http.get('https://brew.new/api/v1/chats', () =>
        HttpResponse.json(
          {
            error: {
              code: 'INVALID_REQUEST',
              type: 'invalid_request',
              message: 'The cursor is malformed.',
              param: 'cursor',
              suggestion: 'Pass back pagination.cursor unchanged.',
              docs: 'https://docs.brew.new/api-reference/api/errors',
            },
          },
          { status: 400 }
        )
      )
    )

    const { client } = makeTestHttpClient()

    await expect(
      createChatsResource(client).list({ cursor: 'garbage' })
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_REQUEST' })
  })

  it('types the rows', () => {
    expectTypeOf<ChatSummary['origin']>().toEqualTypeOf<'slack' | null>()
    expectTypeOf<{ limit: 10; cursor: 'c' }>().toExtend<ListChatsInput>()
  })
})

describe('chats.listAll', () => {
  it('walks every page following pagination.cursor and yields rows', async () => {
    const seenCursors: Array<string | null> = []
    server.use(
      http.get('https://brew.new/api/v1/chats', ({ request }) => {
        const params = new URL(request.url).searchParams
        seenCursors.push(params.get('cursor'))
        expect(params.get('limit')).toBe('2')
        if (params.get('cursor') === null) {
          return HttpResponse.json({
            data: [chat('c1'), chat('c2')],
            pagination: { limit: 2, cursor: 'native_2', hasMore: true },
          })
        }
        return HttpResponse.json({
          data: [chat('c3')],
          pagination: { limit: 2, cursor: null, hasMore: false },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const ids: Array<string> = []
    for await (const row of createChatsResource(client).listAll({
      limit: 2,
    })) {
      ids.push(row.chatId)
    }

    expect(ids).toEqual(['c1', 'c2', 'c3'])
    expect(seenCursors).toEqual([null, 'native_2'])
  })

  it('stops fetching once the caller aborts between pages', async () => {
    let calls = 0
    server.use(
      http.get('https://brew.new/api/v1/chats', () => {
        calls += 1
        return HttpResponse.json({
          data: [chat(`c${String(calls)}`)],
          pagination: {
            limit: 1,
            cursor: `next_${String(calls)}`,
            hasMore: true,
          },
        })
      })
    )

    const controller = new AbortController()
    const { client } = makeTestHttpClient()
    const ids: Array<string> = []
    for await (const row of createChatsResource(client).listAll(
      {},
      { signal: controller.signal }
    )) {
      ids.push(row.chatId)
      controller.abort()
    }

    expect(ids).toEqual(['c1'])
    expect(calls).toBe(1)
  })
})
