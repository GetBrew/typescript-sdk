import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import {
  AUDIT_EMAIL_DEFAULT_TIMEOUT_MS,
  createAuditEmail,
  type AuditEmailInput,
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
  it('accepts exactly one content source and versions only saved emails', () => {
    const inputs: Array<AuditEmailInput> = [
      { emailHtml: '<p>Hello</p>' },
      { emailJsx: '<Text>Hello</Text>' },
      { emailId: 'email_123', emailVersionId: 'version_123' },
    ]
    // @ts-expect-error HTML and JSX cannot be selected together.
    const mixedContent: AuditEmailInput = {
      emailHtml: '<p>Hello</p>',
      emailJsx: '<Text>Hello</Text>',
    }
    // @ts-expect-error Saved emails cannot also supply raw content.
    const mixedSaved: AuditEmailInput = {
      emailId: 'email_123',
      emailHtml: '<p>Hello</p>',
    }
    // @ts-expect-error Versions apply only to saved emails.
    const versionedHtml: AuditEmailInput = {
      emailHtml: '<p>Hello</p>',
      emailVersionId: 'version_123',
    }
    // @ts-expect-error Versions apply only to saved emails.
    const versionedJsx: AuditEmailInput = {
      emailJsx: '<Text>Hello</Text>',
      emailVersionId: 'version_123',
    }
    // @ts-expect-error An audit requires a content source.
    const missingSource: AuditEmailInput = { subject: 'Hello' }

    expect(inputs).toHaveLength(3)
    expect([
      mixedContent,
      mixedSaved,
      versionedHtml,
      versionedJsx,
      missingSource,
    ]).toHaveLength(5)
  })

  it.each([
    { emailJsx: '<Text>Hello</Text>', subject: 'JSX content' },
    {
      emailId: 'email_123',
      emailVersionId: 'version_123',
      subject: 'Saved content',
    },
  ])('forwards the content selector unchanged: %j', async (input) => {
    let capturedBody: unknown
    server.use(
      http.post('https://brew.new/api/v1/emails/audit', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(COMPLETE_AUDIT)
      })
    )
    const { client } = makeTestHttpClient()
    await createAuditEmail(client)(input)
    expect(capturedBody).toEqual(input)
  })

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
