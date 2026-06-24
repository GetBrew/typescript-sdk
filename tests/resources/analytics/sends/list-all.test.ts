import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createListAllSends } from '../../../../src/resources/analytics/sends/list'
import { makeTestHttpClient } from '../../../helpers/http-client'
import { server } from '../../../msw/server'

describe('analytics.sends.listAll', () => {
  it('walks every page following pagination.cursor', async () => {
    const seenCursors: Array<string | null> = []
    server.use(
      http.get('https://brew.new/api/v1/analytics/sends', ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor')
        seenCursors.push(cursor)
        if (cursor === null) {
          return HttpResponse.json({
            data: [
              {
                sendId: 'snd_1',
                kind: 'campaign',
                emailId: 'eml_1',
                status: 'sent',
                createdAt: '2026-04-08T12:00:00.000Z',
                updatedAt: '2026-04-08T12:00:00.000Z',
              },
            ],
            pagination: { limit: 1, cursor: 'page2', hasMore: true },
          })
        }
        return HttpResponse.json({
          data: [
            {
              sendId: 'snd_2',
              kind: 'campaign',
              emailId: 'eml_2',
              status: 'sent',
              createdAt: '2026-04-08T13:00:00.000Z',
              updatedAt: '2026-04-08T13:00:00.000Z',
            },
          ],
          pagination: { limit: 1, cursor: null, hasMore: false },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const listAll = createListAllSends(client)

    const ids: Array<string> = []
    for await (const send of listAll({ limit: 1 })) {
      ids.push(send.sendId)
    }

    expect(ids).toEqual(['snd_1', 'snd_2'])
    expect(seenCursors).toEqual([null, 'page2'])
  })
})
