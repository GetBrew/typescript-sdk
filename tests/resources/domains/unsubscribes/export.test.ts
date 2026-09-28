import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createDomainsResource } from '../../../../src/resources/domains/resource'
import { makeTestHttpClient } from '../../../helpers/http-client'
import { server } from '../../../msw/server'

const CSV =
  'Email,Scope,Unsubscribed At,Source,Send ID\njane@example.com,domain,2026-09-17T09:12:00.000Z,link,send_123\n'

describe('domains.unsubscribes.export', () => {
  it('GETs the export route with ?scope and returns the CSV inside the JSON envelope', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/domains/dom%2F123/unsubscribes/export',
        ({ request }) => {
          capturedRequest = request
          return HttpResponse.json({
            domainId: 'dom/123',
            domainHost: 'send.example.com',
            csv: CSV,
            rowCount: 1,
            truncated: false,
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const domains = createDomainsResource(client)

    const result = await domains.unsubscribes.export({
      domainId: 'dom/123',
      scope: 'domain',
    })

    expect(capturedRequest?.method).toBe('GET')
    const url = new URL(capturedRequest!.url)
    expect(url.pathname).toBe('/api/v1/domains/dom%2F123/unsubscribes/export')
    expect(url.searchParams.get('scope')).toBe('domain')
    expect(result.csv).toBe(CSV)
    expect(result.rowCount).toBe(1)
    expect(result.truncated).toBe(false)
  })

  it('sends no scope when the caller wants every opt-out', async () => {
    let capturedUrl: URL | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/domains/dom_123/unsubscribes/export',
        ({ request }) => {
          capturedUrl = new URL(request.url)
          return HttpResponse.json({
            domainId: 'dom_123',
            domainHost: 'send.example.com',
            csv: 'Email,Scope,Unsubscribed At,Source,Send ID\n',
            rowCount: 0,
            truncated: false,
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const domains = createDomainsResource(client)

    const result = await domains.unsubscribes.export({ domainId: 'dom_123' })

    expect(capturedUrl?.search).toBe('')
    expect(result.rowCount).toBe(0)
  })
})
