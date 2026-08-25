import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import {
  AUDIT_EMAIL_DEFAULT_TIMEOUT_MS,
  createAuditEmail,
  type EmailAuditResponse,
} from '../../../src/resources/emails/audit'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const COMPLETE_AUDIT = {
  schemaVersion: 1,
  rulesetVersion: '2026-08-24.3',
  auditId: '00000000-0000-4000-8000-000000000001',
  contentHash:
    'sha256:0000000000000000000000000000000000000000000000000000000000000000',
  auditedAt: '2026-08-23T00:00:00.000Z',
  expiresAt: '2026-08-23T00:15:00.000Z',
  policy: {
    purpose: 'marketing',
    source: 'provided',
    unsubscribe: 'required',
  },
  summary: { blockers: 0, errors: 0, warnings: 0, info: 0, total: 0 },
  checks: [],
  metrics: {
    htmlBytes: 100,
    linkCount: 1,
    imageCount: 0,
    gifCount: 0,
    loadedSize: {
      status: 'exact',
      htmlBytes: 100,
      remoteAssetBytes: 0,
      totalBytes: 100,
      assetCount: 0,
    },
  },
  findings: [],
  totalFindings: 0,
  findingsTruncated: false,
  completion: { status: 'complete', readiness: 'ready', score: 100 },
}

describe('emails.auditEmail', () => {
  it('keeps ruleset versions forward-compatible and types occurrence counts', () => {
    const futureRuleset: EmailAuditResponse['rulesetVersion'] = 'future-ruleset'
    const occurrenceCount: EmailAuditResponse['findings'][number]['occurrenceCount'] = 3

    expect(futureRuleset).toBe('future-ruleset')
    expect(occurrenceCount).toBe(3)
  })

  it('uses a timeout above the server audit budget', () => {
    expect(AUDIT_EMAIL_DEFAULT_TIMEOUT_MS).toBe(65_000)
  })

  it('POSTs the exact raw email content to /v1/emails/audit', async () => {
    let capturedBody: unknown
    server.use(
      http.post('https://brew.new/api/v1/emails/audit', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(COMPLETE_AUDIT, {
          headers: { 'X-Credit-Cost': '5' },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const audit = createAuditEmail(client)
    const result = await audit({
      emailHtml: '<p>Hello</p>',
      subject: 'Hello',
      previewText: '',
      sendingPurpose: 'marketing',
    })

    expect(capturedBody).toEqual({
      emailHtml: '<p>Hello</p>',
      subject: 'Hello',
      previewText: '',
      sendingPurpose: 'marketing',
    })
    expect(result.completion).toEqual({
      status: 'complete',
      readiness: 'ready',
      score: 100,
    })
  })

  it('exposes zero-cost partial responses and their credit header', async () => {
    server.use(
      http.post('https://brew.new/api/v1/emails/audit', () =>
        HttpResponse.json(
          {
            ...COMPLETE_AUDIT,
            completion: {
              status: 'partial',
              readiness: 'unknown',
              score: null,
            },
          },
          { headers: { 'X-Credit-Cost': '0' } }
        )
      )
    )

    const { client } = makeTestHttpClient()
    const audit = createAuditEmail(client)
    const response = await audit({ emailHtml: '<p>Hello</p>' }, { raw: true })

    expect(response.headers.get('x-credit-cost')).toBe('0')
    expect(response.data.completion.status).toBe('partial')
    expect(response.data.completion.score).toBeNull()
  })
})
