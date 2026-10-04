import { http, HttpResponse } from 'msw'
import { describe, expect, expectTypeOf, it } from 'vitest'

import type {
  InsightPulse,
  InsightSummary,
  ListInsightsInput,
} from '../../../src/index'
import { createInsightsResource } from '../../../src/resources/insights/resource'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const ROW = {
  insightId: 'k17a8m2v4w5x6y7z8a9b0c1d2e3f4g5h',
  title: 'Spring sale',
  description: 'Spring sale bounced 6.2% of sends, above the 6% line.',
  severity: 'critical',
  confidence: 'high',
  kind: 'insight',
  category: 'deliverability',
  detectorId: 'deliv.bounce_rate_breach',
  state: 'active',
  firstSeenAt: '2026-10-01T12:00:00.000Z',
  lastSeenAt: '2026-10-02T06:04:12.000Z',
  recurrenceCount: 1,
  action: {
    kind: 'navigate',
    label: 'Open campaign analytics',
    url: 'https://brew.new/analytics/sends/Vx2mZ8t9QbY3sW1vR0pLd',
  },
  url: 'https://brew.new/insights/k17a8m2v4w5x6y7z8a9b0c1d2e3f4g5h',
}

const FRESHNESS = {
  dataAsOf: '2026-10-02T06:00:00.000Z',
  lastSuccessfulRunAt: '2026-10-02T06:04:12.000Z',
  latestAttempt: { status: 'succeeded', at: '2026-10-02T06:04:12.000Z' },
}

const PULSE = {
  windowEnd: '2026-10-02T00:00:00.000Z',
  delivered: 12400,
  priorDelivered: 11900,
  uniqueOpens: 4960,
  priorUniqueOpens: 4400,
  uniqueClicks: 620,
  priorUniqueClicks: 590,
  unsubscribed: 18,
  priorUnsubscribed: 21,
  openRatePct: 40,
  priorOpenRatePct: 37,
  clickRatePct: 5,
  priorClickRatePct: 5,
  openDirection: 'up',
  clickDirection: 'steady',
  countsOnly: false,
  measured: true,
}

describe('insights.list', () => {
  it('GETs /v1/insights with no query by default and returns { data, pagination, freshness }', async () => {
    let url: URL | undefined
    server.use(
      http.get('https://brew.new/api/v1/insights', ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json({
          data: [ROW],
          pagination: { limit: 100, cursor: null, hasMore: false },
          freshness: FRESHNESS,
        })
      })
    )

    const { client } = makeTestHttpClient()
    const page = await createInsightsResource(client).list()

    expect(url?.pathname).toBe('/api/v1/insights')
    expect(url?.search).toBe('')
    expect(page.data[0]?.insightId).toBe(ROW.insightId)
    expect(page.data[0]?.severity).toBe('critical')
    expect(page.data[0]?.action?.kind).toBe('navigate')
    expect(page.freshness.latestAttempt?.status).toBe('succeeded')
    expect(page.pagination.hasMore).toBe(false)
  })

  it('forwards state, severity, limit and cursor, and joins an include array with commas', async () => {
    let params: URLSearchParams | undefined
    server.use(
      http.get('https://brew.new/api/v1/insights', ({ request }) => {
        params = new URL(request.url).searchParams
        return HttpResponse.json({
          data: [],
          pagination: { limit: 20, cursor: null, hasMore: false },
          freshness: FRESHNESS,
          pulse: PULSE,
          memo: null,
        })
      })
    )

    const { client } = makeTestHttpClient()
    const page = await createInsightsResource(client).list({
      state: 'all',
      severity: 'warning',
      include: ['pulse', 'memo'],
      limit: 20,
      cursor: 'b2Zmc2V0OjIw',
    })

    expect(params?.get('state')).toBe('all')
    expect(params?.get('severity')).toBe('warning')
    expect(params?.getAll('include')).toEqual(['pulse,memo'])
    expect(params?.get('limit')).toBe('20')
    expect(params?.get('cursor')).toBe('b2Zmc2V0OjIw')
    expect(page.pulse?.openDirection).toBe('up')
    // An expansion that does not exist yet answers null.
    expect(page.memo).toBeNull()
  })

  it('passes a comma-string include through and drops an empty one', async () => {
    const includes: Array<string | null> = []
    server.use(
      http.get('https://brew.new/api/v1/insights', ({ request }) => {
        includes.push(new URL(request.url).searchParams.get('include'))
        return HttpResponse.json({
          data: [],
          pagination: { limit: 100, cursor: null, hasMore: false },
          freshness: FRESHNESS,
        })
      })
    )

    const { client } = makeTestHttpClient()
    const insights = createInsightsResource(client)
    await insights.list({ include: 'report,suggestions' })
    await insights.list({ include: [] })

    expect(includes).toEqual(['report,suggestions', null])
  })

  it('returns the full BrewRawResponse with { raw: true }', async () => {
    server.use(
      http.get('https://brew.new/api/v1/insights', () =>
        HttpResponse.json(
          {
            data: [ROW],
            pagination: { limit: 100, cursor: null, hasMore: false },
            freshness: FRESHNESS,
          },
          { headers: { 'x-request-id': 'req_insights' } }
        )
      )
    )

    const { client } = makeTestHttpClient()
    const raw = await createInsightsResource(client).list(undefined, {
      raw: true,
    })

    expect(raw.status).toBe(200)
    expect(raw.requestId).toBe('req_insights')
    expect(raw.data.data).toHaveLength(1)
  })

  it('surfaces an unknown include token as 400 INVALID_REQUEST', async () => {
    server.use(
      http.get('https://brew.new/api/v1/insights', () =>
        HttpResponse.json(
          {
            error: {
              code: 'INVALID_REQUEST',
              type: 'invalid_request',
              message: 'Unknown include token: graph.',
              param: 'include',
              suggestion: 'Use pulse, report, suggestions or memo.',
              docs: 'https://docs.brew.new/api-reference/api/errors',
            },
          },
          { status: 400 }
        )
      )
    )

    const { client } = makeTestHttpClient()

    await expect(
      createInsightsResource(client).list({ include: 'graph' })
    ).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_REQUEST',
      param: 'include',
    })
  })

  it('types the include tokens, the rows and the expansions', () => {
    expectTypeOf<{
      include: ['pulse', 'report']
    }>().toExtend<ListInsightsInput>()
    expectTypeOf<{ include: ['graph'] }>().not.toExtend<ListInsightsInput>()
    expectTypeOf<{ state: 'closed' }>().not.toExtend<ListInsightsInput>()
    expectTypeOf<InsightSummary['severity']>().toEqualTypeOf<
      'critical' | 'warning' | 'opportunity' | 'info'
    >()
    expectTypeOf<InsightPulse['openDirection']>().toEqualTypeOf<
      'up' | 'down' | 'steady'
    >()
  })
})
