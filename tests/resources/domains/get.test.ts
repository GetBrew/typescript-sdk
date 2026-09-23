import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createGetDomain } from '../../../src/resources/domains/get'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('domains.get', () => {
  it('GETs /v1/domains/{domainId} and returns the BARE row with its DNS records', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/domains/dom_123', ({ request }) => {
        url = request.url
        return HttpResponse.json({
          domainId: 'dom_123',
          domainUrl: 'https://acme.com',
          name: 'acme.com',
          region: 'us-east-1',
          status: 'verified',
          sendingEnabled: true,
          sendable: true,
          sendingPurpose: 'marketing',
          records: [],
        })
      })
    )

    const { client } = makeTestHttpClient()
    const domain = await createGetDomain(client)('dom_123')

    expect(new URL(url!).pathname).toBe('/api/v1/domains/dom_123')
    expect(domain.domainId).toBe('dom_123')
    expect(domain.sendable).toBe(true)
  })

  it('surfaces an unknown id as 404 DOMAIN_NOT_FOUND', async () => {
    server.use(
      http.get('https://brew.new/api/v1/domains/dom_missing', () =>
        HttpResponse.json(
          {
            error: {
              code: 'DOMAIN_NOT_FOUND',
              type: 'not_found',
              message: 'Domain dom_missing was not found.',
              suggestion: 'List domains with GET /v1/domains.',
              docs: 'https://docs.brew.new/api-reference/api/errors',
            },
          },
          { status: 404 }
        )
      )
    )

    const { client } = makeTestHttpClient()

    await expect(createGetDomain(client)('dom_missing')).rejects.toMatchObject({
      status: 404,
      code: 'DOMAIN_NOT_FOUND',
    })
  })
})
