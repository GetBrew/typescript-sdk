import { http, HttpResponse } from 'msw'
import { describe, expect, expectTypeOf, it } from 'vitest'

import type {
  DomainHealthIncludeToken,
  DomainScoreRun,
  DomainScoreSnapshot,
  GetDomainHealthInput,
} from '../../../src/index'
import { createDomainsResource } from '../../../src/resources/domains/resource'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('domains.health', () => {
  it('GETs the aggregate domain health report', async () => {
    let captured: Request | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/domains/dom%2F1/health',
        ({ request }) => {
          captured = request.clone()
          return HttpResponse.json({
            domainId: 'dom/1',
            name: 'send.example.com',
            status: 'verified',
            sendable: true,
            verdict: 'healthy',
            score: {
              value: 96,
              grade: 'excellent',
              confidence: 'high',
              components: {
                placement: { score: 100, weight: 0.35, basis: 'Recent tests' },
                authentication: { score: 100, weight: 0.2, basis: 'DNS' },
                reputation: { score: 94, weight: 0.2, basis: 'Events' },
                content: { score: 90, weight: 0.15, basis: 'Tests' },
                posture: { score: 100, weight: 0.1, basis: 'Tracking' },
              },
              trend: null,
            },
            authentication: {
              spf: 'verified',
              dkim: 'verified',
              dmarc: 'verified',
            },
            tracking: {},
            warmup: [],
            dailyVolume: [],
            domainActivity: {
              sampled: true,
              sampleSendCount: 0,
              sentCount: 0,
              bouncedCount: 0,
              complainedCount: 0,
              bounceRate: 0,
              complaintRate: 0,
            },
            orgReputation: null,
            recentPlacementTests: [],
            signals: [],
            checkedAt: '2026-07-20T12:00:00.000Z',
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const domains = createDomainsResource(client)
    const result = await domains.health({ domainId: 'dom/1' })

    expect(new URL(captured!.url).pathname).toBe(
      '/api/v1/domains/dom%2F1/health'
    )
    expect(result.verdict).toBe('healthy')
  })
})

describe('domains.health — include scoreHistory / scoreRuns', () => {
  const REPORT = {
    domainId: 'dom_1',
    name: 'send.example.com',
    status: 'verified',
    sendable: true,
    verdict: 'healthy',
    readiness: 'ready',
    score: {
      value: 96,
      grade: 'excellent',
      confidence: 'high',
      components: {
        placement: { score: 100, weight: 0.35, basis: 'Recent tests' },
        authentication: { score: 100, weight: 0.2, basis: 'DNS' },
        reputation: { score: 94, weight: 0.2, basis: 'Events' },
        content: { score: 90, weight: 0.15, basis: 'Tests' },
        posture: { score: 100, weight: 0.1, basis: 'Tracking' },
      },
      trend: null,
    },
    authentication: { spf: 'verified', dkim: 'verified', dmarc: 'verified' },
    tracking: {},
    warmup: [],
    dailyVolume: [],
    domainActivity: null,
    orgReputation: null,
    recentPlacementTests: [],
    signals: [],
    checkedAt: '2026-07-20T12:00:00.000Z',
  }
  const PILLAR = { score: 90, weight: 0.2 }

  it('sends no query without include', async () => {
    let url: URL | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/domains/:domainId/health',
        ({ request }) => {
          url = new URL(request.url)
          return HttpResponse.json(REPORT)
        }
      )
    )

    const { client } = makeTestHttpClient()
    const result = await createDomainsResource(client).health({
      domainId: 'dom_1',
    })

    expect(url?.search).toBe('')
    expect(result.scoreHistory).toBeUndefined()
    expect(result.scoreRuns).toBeUndefined()
  })

  it('joins the include tokens and returns scoreHistory and scoreRuns', async () => {
    const includes: Array<string | null> = []
    server.use(
      http.get(
        'https://brew.new/api/v1/domains/:domainId/health',
        ({ request }) => {
          includes.push(new URL(request.url).searchParams.get('include'))
          return HttpResponse.json({
            ...REPORT,
            scoreHistory: [
              {
                score: 96,
                grade: 'excellent',
                confidence: 'high',
                trigger: 'domain_score_run',
                computedAt: '2026-07-20T12:00:00.000Z',
                components: {
                  placement: PILLAR,
                  authentication: PILLAR,
                  reputation: PILLAR,
                  content: PILLAR,
                  posture: PILLAR,
                },
              },
            ],
            scoreRuns: [
              {
                runId: 'dsr_1',
                trigger: 'manual',
                status: 'completed',
                scoreAfter: { score: 96, grade: 'excellent' },
                creditsCharged: 50,
                variants: [
                  { variant: 'plain_text', status: 'completed', testId: 't1' },
                ],
                createdAt: '2026-07-20T11:00:00.000Z',
                updatedAt: '2026-07-20T12:00:00.000Z',
              },
            ],
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const domains = createDomainsResource(client)
    const result = await domains.health({
      domainId: 'dom_1',
      include: ['scoreHistory', 'scoreRuns'],
    })
    await domains.health({ domainId: 'dom_1', include: 'scoreRuns' })
    await domains.health({ domainId: 'dom_1', include: [] })

    expect(includes).toEqual(['scoreHistory,scoreRuns', 'scoreRuns', null])
    expect(result.scoreHistory?.[0]?.trigger).toBe('domain_score_run')
    expect(result.scoreRuns?.[0]?.scoreAfter?.grade).toBe('excellent')
    expect(result.scoreRuns?.[0]?.variants[0]?.variant).toBe('plain_text')
  })

  it('surfaces an unknown include token as 400 INVALID_REQUEST', async () => {
    server.use(
      http.get('https://brew.new/api/v1/domains/:domainId/health', () =>
        HttpResponse.json(
          {
            error: {
              code: 'INVALID_REQUEST',
              type: 'invalid_request',
              message: 'Unknown include token: history.',
              param: 'include',
              suggestion: 'Use scoreHistory or scoreRuns.',
              docs: 'https://docs.brew.new/api-reference/api/errors',
            },
          },
          { status: 400 }
        )
      )
    )

    const { client } = makeTestHttpClient()

    await expect(
      createDomainsResource(client).health({
        domainId: 'dom_1',
        include: 'history',
      })
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_REQUEST' })
  })

  it('types the include tokens and the expansions', () => {
    expectTypeOf<DomainHealthIncludeToken>().toEqualTypeOf<
      'scoreHistory' | 'scoreRuns'
    >()
    expectTypeOf<{
      domainId: string
      include: ['scoreHistory']
    }>().toExtend<GetDomainHealthInput>()
    expectTypeOf<{
      domainId: string
      include: ['graph']
    }>().not.toExtend<GetDomainHealthInput>()
    expectTypeOf<DomainScoreRun['trigger']>().toEqualTypeOf<
      'domain_verified' | 'manual'
    >()
    expectTypeOf<DomainScoreSnapshot['grade']>().toEqualTypeOf<
      'excellent' | 'good' | 'fair' | 'poor' | 'critical'
    >()
  })
})
