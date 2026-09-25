import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createGetEmailAudit } from '../../../src/resources/emails/get-audit'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const PAGE = {
  schemaVersion: 1,
  rulesetVersion: '2026-09-01',
  auditId: 'aud_123',
  contentHash: 'sha256:abc',
  auditedAt: '2026-09-24T10:00:00.000Z',
  expiresAt: '2026-10-01T10:00:00.000Z',
  policy: {
    purpose: 'marketing',
    source: 'provided',
    unsubscribe: 'required',
  },
  summary: { blockers: 0, errors: 1, warnings: 0, info: 0, total: 1 },
  checks: [],
  findings: [],
  pagination: { limit: 25, cursor: 'cur_2', hasMore: true },
}

describe('emails.getAudit', () => {
  it('GETs /v1/emails/audits/{auditId} with the page cursor and limit', async () => {
    let url: string | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/emails/audits/aud_123',
        ({ request }) => {
          url = request.url
          return HttpResponse.json(PAGE)
        }
      )
    )

    const { client } = makeTestHttpClient()
    const page = await createGetEmailAudit(client)('aud_123', {
      cursor: 'cur_1',
      limit: 25,
    })

    const sent = new URL(url!)
    expect(sent.pathname).toBe('/api/v1/emails/audits/aud_123')
    expect(sent.searchParams.get('cursor')).toBe('cur_1')
    expect(sent.searchParams.get('limit')).toBe('25')
    expect(page.auditId).toBe('aud_123')
    expect(page.summary.errors).toBe(1)
  })

  it('sends no query when no page options are given', async () => {
    let url: string | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/emails/audits/aud_123',
        ({ request }) => {
          url = request.url
          return HttpResponse.json(PAGE)
        }
      )
    )

    const { client } = makeTestHttpClient()
    await createGetEmailAudit(client)('aud_123')

    expect(new URL(url!).search).toBe('')
  })

  it('surfaces an expired or unknown report as 404 AUDIT_NOT_FOUND', async () => {
    server.use(
      http.get('https://brew.new/api/v1/emails/audits/:auditId', () =>
        HttpResponse.json(
          {
            error: {
              code: 'AUDIT_NOT_FOUND',
              type: 'not_found',
              message: 'Audit aud_gone was not found.',
              docs: 'https://docs.brew.new/api-reference/api/errors',
            },
          },
          { status: 404 }
        )
      )
    )

    const { client } = makeTestHttpClient()
    await expect(createGetEmailAudit(client)('aud_gone')).rejects.toMatchObject(
      { status: 404, code: 'AUDIT_NOT_FOUND' }
    )
  })
})
