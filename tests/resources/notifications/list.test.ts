import { http, HttpResponse } from 'msw'
import { describe, expect, expectTypeOf, it } from 'vitest'

import type {
  ListNotificationsInput,
  NotificationRow,
  NotificationType,
} from '../../../src/index'
import { createNotificationsResource } from '../../../src/resources/notifications/resource'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

function notification(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    type: 'email_sent',
    status: 'completed',
    title: 'Spring launch sent',
    subtitle: '12,480 recipients',
    url: 'https://brew.new/emails?emailIds=2SmZOWV3ZQ7W5x6g3m4pA',
    emailId: '2SmZOWV3ZQ7W5x6g3m4pA',
    isPersonal: false,
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-01T12:20:00.000Z',
    completedAt: '2026-10-01T12:20:00.000Z',
    ...overrides,
  }
}

describe('notifications.list', () => {
  it('GETs /v1/notifications with no query by default and returns { data, pagination }', async () => {
    let url: URL | undefined
    server.use(
      http.get('https://brew.new/api/v1/notifications', ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json({
          data: [notification('ntf_4b8f0c2e91d7a3f65e10')],
          pagination: { limit: 100, cursor: null, hasMore: false },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const page = await createNotificationsResource(client).list()

    expect(url?.pathname).toBe('/api/v1/notifications')
    expect(url?.search).toBe('')
    expect(page.data[0]?.type).toBe('email_sent')
    expect(page.data[0]?.emailId).toBe('2SmZOWV3ZQ7W5x6g3m4pA')
    expect(page.data[0]?.isPersonal).toBe(false)
  })

  it('forwards type, limit and cursor', async () => {
    let params: URLSearchParams | undefined
    server.use(
      http.get('https://brew.new/api/v1/notifications', ({ request }) => {
        params = new URL(request.url).searchParams
        return HttpResponse.json({
          data: [],
          pagination: { limit: 10, cursor: null, hasMore: false },
        })
      })
    )

    const { client } = makeTestHttpClient()
    await createNotificationsResource(client).list({
      type: 'domain_score_run',
      limit: 10,
      cursor: 'native_cursor',
    })

    expect(params?.get('type')).toBe('domain_score_run')
    expect(params?.get('limit')).toBe('10')
    expect(params?.get('cursor')).toBe('native_cursor')
  })

  it('returns a short page with hasMore: true as the server sent it', async () => {
    server.use(
      http.get('https://brew.new/api/v1/notifications', () =>
        HttpResponse.json({
          data: [notification('ntf_1')],
          pagination: { limit: 100, cursor: 'native_2', hasMore: true },
        })
      )
    )

    const { client } = makeTestHttpClient()
    const page = await createNotificationsResource(client).list()

    expect(page.data).toHaveLength(1)
    expect(page.pagination).toEqual({
      limit: 100,
      cursor: 'native_2',
      hasMore: true,
    })
  })

  it('returns the full BrewRawResponse with { raw: true }', async () => {
    server.use(
      http.get('https://brew.new/api/v1/notifications', () =>
        HttpResponse.json(
          {
            data: [notification('ntf_raw')],
            pagination: { limit: 100, cursor: null, hasMore: false },
          },
          { headers: { 'x-request-id': 'req_ntf' } }
        )
      )
    )

    const { client } = makeTestHttpClient()
    const raw = await createNotificationsResource(client).list(undefined, {
      raw: true,
    })

    expect(raw.requestId).toBe('req_ntf')
    expect(raw.data.data[0]?.id).toBe('ntf_raw')
  })

  it('surfaces an unknown type as 400 INVALID_REQUEST', async () => {
    server.use(
      http.get('https://brew.new/api/v1/notifications', () =>
        HttpResponse.json(
          {
            error: {
              code: 'INVALID_REQUEST',
              type: 'invalid_request',
              message: 'Unknown notification type.',
              param: 'type',
              suggestion: 'Use one of the documented types.',
              docs: 'https://docs.brew.new/api-reference/api/errors',
            },
          },
          { status: 400 }
        )
      )
    )

    const { client } = makeTestHttpClient()

    await expect(
      createNotificationsResource(client).list()
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_REQUEST' })
  })

  it('types the type filter and the rows', () => {
    expectTypeOf<{ type: 'comment_reply' }>().toExtend<ListNotificationsInput>()
    expectTypeOf<{ type: 'bogus' }>().not.toExtend<ListNotificationsInput>()
    expectTypeOf<NotificationRow['type']>().toEqualTypeOf<NotificationType>()
    expectTypeOf<'gradual_send_paused'>().toExtend<NotificationType>()
  })
})

describe('notifications.listAll', () => {
  it('keeps paging through short and empty pages while hasMore is true', async () => {
    const seenCursors: Array<string | null> = []
    server.use(
      http.get('https://brew.new/api/v1/notifications', ({ request }) => {
        const params = new URL(request.url).searchParams
        const cursor = params.get('cursor')
        seenCursors.push(cursor)
        expect(params.get('type')).toBe('email_sent')
        if (cursor === null) {
          return HttpResponse.json({
            data: [notification('ntf_1')],
            pagination: { limit: 100, cursor: 'n2', hasMore: true },
          })
        }
        if (cursor === 'n2') {
          // A page can hold no rows at all while more remain.
          return HttpResponse.json({
            data: [],
            pagination: { limit: 100, cursor: 'n3', hasMore: true },
          })
        }
        return HttpResponse.json({
          data: [notification('ntf_2'), notification('ntf_3')],
          pagination: { limit: 100, cursor: null, hasMore: false },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const ids: Array<string> = []
    for await (const row of createNotificationsResource(client).listAll({
      type: 'email_sent',
    })) {
      ids.push(row.id)
    }

    expect(ids).toEqual(['ntf_1', 'ntf_2', 'ntf_3'])
    expect(seenCursors).toEqual([null, 'n2', 'n3'])
  })
})
