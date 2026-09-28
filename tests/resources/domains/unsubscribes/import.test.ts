import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createDomainsResource } from '../../../../src/resources/domains/resource'
import { makeTestHttpClient } from '../../../helpers/http-client'
import { server } from '../../../msw/server'

const IMPORT_RESPONSE = {
  domainId: 'dom_123',
  domainHost: 'send.example.com',
  summary: {
    rows: 2,
    added: 2,
    alreadyUnsubscribed: 0,
    created: 1,
    skipped: 0,
  },
  skippedSample: [],
  truncated: false,
  column: 'Email Address',
}

describe('domains.unsubscribes.import', () => {
  it('POSTs the CSV text and column to the import route with an idempotency key', async () => {
    let capturedRequest: Request | undefined
    let capturedBody: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/domains/dom%2F123/unsubscribes/import',
        async ({ request }) => {
          capturedRequest = request.clone()
          capturedBody = await request.json()
          return HttpResponse.json(IMPORT_RESPONSE)
        }
      )
    )

    const { client } = makeTestHttpClient()
    const domains = createDomainsResource(client)

    const csv = 'Email Address\njane@example.com\nsam@example.com\n'
    const result = await domains.unsubscribes.import({
      domainId: 'dom/123',
      csv,
      column: 'Email Address',
    })

    expect(capturedRequest?.method).toBe('POST')
    expect(new URL(capturedRequest!.url).pathname).toBe(
      '/api/v1/domains/dom%2F123/unsubscribes/import'
    )
    expect(capturedRequest?.headers.get('idempotency-key')).toBeTruthy()
    expect(capturedBody).toEqual({ csv, column: 'Email Address' })
    expect(result.summary.added).toBe(2)
    expect(result.truncated).toBe(false)
    expect(result.column).toBe('Email Address')
  })

  it('omits column when the caller lets the API detect it, and honors a caller key', async () => {
    let capturedRequest: Request | undefined
    let capturedBody: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/domains/dom_123/unsubscribes/import',
        async ({ request }) => {
          capturedRequest = request.clone()
          capturedBody = await request.json()
          return HttpResponse.json({ ...IMPORT_RESPONSE, column: 'email' })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const domains = createDomainsResource(client)

    await domains.unsubscribes.import(
      { domainId: 'dom_123', csv: 'email\njane@example.com\n' },
      { idempotencyKey: 'import-unsubs-001' }
    )

    expect(capturedBody).toEqual({ csv: 'email\njane@example.com\n' })
    expect(capturedRequest?.headers.get('idempotency-key')).toBe(
      'import-unsubs-001'
    )
  })
})
