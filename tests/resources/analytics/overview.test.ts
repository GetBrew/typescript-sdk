import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createAnalyticsResource } from '../../../src/resources/analytics/resource'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('analytics.overview', () => {
  it('GETs the app-parity analytics overview with composable filters', async () => {
    let captured: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/analytics/overview', ({ request }) => {
        captured = request.clone()
        return HttpResponse.json({
          totals: { sent: 10, delivered: 9 },
          rates: { deliveryRate: 0.9 },
          buckets: [],
          granularity: '1d',
          timeZone: 'America/New_York',
          range: {
            from: '2026-07-01T00:00:00.000Z',
            to: '2026-07-08T00:00:00.000Z',
          },
          truncated: false,
        })
      })
    )

    const { client } = makeTestHttpClient()
    const analytics = createAnalyticsResource(client)
    const result = await analytics.overview({
      automationId: 'auto_1,auto_2',
      source: 'api,automation_manual',
      domain: 'send.example.com',
    })

    const url = new URL(captured!.url)
    expect(url.searchParams.get('automationId')).toBe('auto_1,auto_2')
    expect(url.searchParams.get('source')).toBe('api,automation_manual')
    expect(url.searchParams.get('domain')).toBe('send.example.com')
    expect(result.truncated).toBe(false)
  })
})
