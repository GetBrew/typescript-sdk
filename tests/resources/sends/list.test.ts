import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createListSends } from '../../../src/resources/sends/list'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('sends.list', () => {
  it('GETs /v1/sends with filters and returns { data, pagination }', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/sends', ({ request }) => {
        url = request.url
        return HttpResponse.json({
          data: [
            {
              sendId: 'snd_promo',
              kind: 'campaign',
              emailId: 'eml_promo',
              status: 'completed',
              audienceId: 'aud_1',
              createdAt: '2026-04-08T12:00:00.000Z',
              updatedAt: '2026-04-08T12:34:56.000Z',
              stats: {
                sent: 100,
                delivered: 98,
                opened: 40,
                clicked: 8,
                bounced: 2,
                complained: 0,
                unsubscribed: 1,
              },
            },
          ],
          pagination: { limit: 50, cursor: null, hasMore: false },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListSends(client)

    const result = await list({ status: 'completed', limit: 50 })

    const params = new URL(url!).searchParams
    expect(new URL(url!).pathname).toBe('/api/v1/sends')
    expect(params.get('status')).toBe('completed')
    expect(params.get('limit')).toBe('50')
    expect(result.data[0]?.emailId).toBe('eml_promo')
    expect(result.data[0]?.stats?.delivered).toBe(98)
    expect(result.pagination.hasMore).toBe(false)
  })

  it('carries the campaign KPI read that replaced analytics.campaigns', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/sends', ({ request }) => {
        url = request.url
        return HttpResponse.json({
          data: [],
          pagination: { limit: 50, cursor: null, hasMore: false },
        })
      })
    )

    const { client } = makeTestHttpClient()
    await createListSends(client)({ kind: 'campaign' })

    expect(new URL(url!).searchParams.get('kind')).toBe('campaign')
  })

  it('passes the automation provenance filters through', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/sends', ({ request }) => {
        url = request.url
        return HttpResponse.json({
          data: [],
          pagination: { limit: 50, cursor: null, hasMore: false },
        })
      })
    )

    const { client } = makeTestHttpClient()
    await createListSends(client)({
      automationId: 'aut_1',
      automationRunId: 'run_1',
      audienceRunId: 'aru_1',
      triggerInstanceId: 'tin_1',
      messageClass: 'transactional',
    })

    const params = new URL(url!).searchParams
    expect(params.get('automationId')).toBe('aut_1')
    expect(params.get('automationRunId')).toBe('run_1')
    expect(params.get('audienceRunId')).toBe('aru_1')
    expect(params.get('triggerInstanceId')).toBe('tin_1')
    expect(params.get('messageClass')).toBe('transactional')
  })
})
