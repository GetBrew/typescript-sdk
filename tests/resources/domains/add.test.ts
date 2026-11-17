import { http, HttpResponse } from 'msw'
import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  type AddDomainResponse,
  createAddDomain,
} from '../../../src/resources/domains/add'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('domains.add', () => {
  it('POSTs /v1/domains and returns the row with its DKIM_SELECTOR_IN_USE warning', async () => {
    let body: unknown
    server.use(
      http.post('https://brew.new/api/v1/domains', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(
          {
            domainId: 'dom_123',
            domainUrl: 'https://brew.new/domains/dom_123',
            name: 'acme.com',
            region: 'us-east-1',
            status: 'pending',
            sendingEnabled: false,
            sendable: false,
            sendingPurpose: 'transactional',
            records: [],
            createdAt: '2026-10-21T00:00:00.000Z',
            updatedAt: '2026-10-21T00:00:00.000Z',
            warnings: [
              {
                code: 'DKIM_SELECTOR_IN_USE',
                message: 'acme.com already publishes a DKIM key there.',
                suggestedNames: ['mail.acme.com'],
              },
            ],
          },
          { status: 201 }
        )
      })
    )

    const { client } = makeTestHttpClient()
    const domain = await createAddDomain(client)({
      name: 'acme.com',
      sendingPurpose: 'transactional',
    })

    expect(body).toEqual({ name: 'acme.com', sendingPurpose: 'transactional' })
    expect(domain.warnings?.[0]?.suggestedNames).toEqual(['mail.acme.com'])
    expectTypeOf<AddDomainResponse['warnings']>().not.toBeUndefined()
  })
})
