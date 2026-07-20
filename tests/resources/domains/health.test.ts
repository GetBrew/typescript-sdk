import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

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
