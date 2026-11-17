import { http, HttpResponse } from 'msw'
import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  BrewApiError,
  type BrewErrorCode,
  type Insight,
  type InsightMetric,
} from '../../../src/index'
import { createInsightsResource } from '../../../src/resources/insights/resource'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const INSIGHT = {
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
  url: 'https://brew.new/insights/k17a8m2v4w5x6y7z8a9b0c1d2e3f4g5h',
  rationale:
    'Mailbox providers start filtering a sender whose campaigns bounce above 6%.',
  closedReason: null,
  closedAt: null,
  lastActedAt: null,
  churnCount: 0,
  metrics: {
    bounceRate: {
      kind: 'rate',
      value: 0.062,
      numerator: 62,
      denominator: 1000,
      basis: 'sent',
    },
    bounced: { kind: 'count', value: 62, noun: 'bounces' },
  },
  evidence: [{ label: '62 bounced, 3 unsubscribed' }],
  subject: {
    kind: 'campaign',
    id: 'Vx2mZ8t9QbY3sW1vR0pLd',
    label: 'Spring sale',
  },
  method: {
    what: 'A campaign whose bounce rate crosses the level mailbox providers act on.',
    how: 'Bounced ÷ sent, compared against fixed thresholds.',
    comparedAgainst: 'Absolute industry thresholds.',
    resolvesWhen: 'A later send of the same campaign stays under 3%.',
  },
  generatedBy: {
    trigger: 'send_settled',
    startedAt: '2026-10-02T06:00:03.000Z',
    completedAt: '2026-10-02T06:04:12.000Z',
    blindSpots: [],
  },
  freshness: {
    dataAsOf: '2026-10-02T06:00:00.000Z',
    lastSuccessfulRunAt: '2026-10-02T06:04:12.000Z',
    latestAttempt: { status: 'succeeded', at: '2026-10-02T06:04:12.000Z' },
  },
}

describe('insights.get', () => {
  it('GETs /v1/insights/{insightId} and returns the BARE finding', async () => {
    let url: URL | undefined
    server.use(
      http.get('https://brew.new/api/v1/insights/:insightId', ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json(INSIGHT)
      })
    )

    const { client } = makeTestHttpClient()
    const insight = await createInsightsResource(client).get(INSIGHT.insightId)

    expect(url?.pathname).toBe(`/api/v1/insights/${INSIGHT.insightId}`)
    expect(url?.search).toBe('')
    expect(insight.rationale).toBe(INSIGHT.rationale)
    expect(insight.metrics['bounceRate']?.kind).toBe('rate')
    expect(insight.subject.kind).toBe('campaign')
    expect(insight.method?.resolvesWhen).toContain('under 3%')
    expect(insight.generatedBy?.trigger).toBe('send_settled')
  })

  it('URL-encodes the insightId path segment', async () => {
    let pathname: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/insights/:insightId', ({ request }) => {
        pathname = new URL(request.url).pathname
        return HttpResponse.json(INSIGHT)
      })
    )

    const { client } = makeTestHttpClient()
    await createInsightsResource(client).get('a/b c')

    expect(pathname).toBe('/api/v1/insights/a%2Fb%20c')
  })

  it('returns the full BrewRawResponse with { raw: true }', async () => {
    server.use(
      http.get('https://brew.new/api/v1/insights/:insightId', () =>
        HttpResponse.json(INSIGHT, {
          headers: { 'x-request-id': 'req_insight' },
        })
      )
    )

    const { client } = makeTestHttpClient()
    const raw = await createInsightsResource(client).get(INSIGHT.insightId, {
      raw: true,
    })

    expect(raw.requestId).toBe('req_insight')
    expect(raw.data.insightId).toBe(INSIGHT.insightId)
  })

  it('surfaces an unknown or other-brand id as 404 INSIGHT_NOT_FOUND', async () => {
    server.use(
      http.get('https://brew.new/api/v1/insights/:insightId', () =>
        HttpResponse.json(
          {
            error: {
              code: 'INSIGHT_NOT_FOUND',
              type: 'not_found',
              message: 'No insight with that id.',
              param: 'insightId',
              suggestion: 'List insights with GET /v1/insights.',
              docs: 'https://docs.brew.new/api-reference/api/errors',
            },
          },
          { status: 404, headers: { 'x-request-id': 'req_404' } }
        )
      )
    )

    const { client } = makeTestHttpClient()
    const error = await createInsightsResource(client)
      .get('nope')
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(BrewApiError)
    expect(error).toMatchObject({
      status: 404,
      code: 'INSIGHT_NOT_FOUND',
      type: 'not_found',
      requestId: 'req_404',
    })
  })

  it('lists INSIGHT_NOT_FOUND in BrewErrorCode and types the frozen metrics', () => {
    expectTypeOf<'INSIGHT_NOT_FOUND'>().toExtend<BrewErrorCode>()
    expectTypeOf<Insight['metrics']>().toEqualTypeOf<
      Record<string, InsightMetric>
    >()
    expectTypeOf<
      Extract<InsightMetric, { kind: 'rate' }>['basis']
    >().toEqualTypeOf<'delivered' | 'sent' | 'uniqueOpened' | 'recipients'>()
  })
})
