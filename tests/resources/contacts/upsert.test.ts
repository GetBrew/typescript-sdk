import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createUpsertContact } from '../../../src/resources/contacts/upsert'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('contacts.upsert', () => {
  it('sends POST /v1/contacts with the contact body and returns the full envelope', async () => {
    let capturedRequest: Request | undefined
    let capturedBody: unknown
    server.use(
      http.post('https://brew.new/api/v1/contacts', async ({ request }) => {
        capturedRequest = request.clone()
        capturedBody = await request.json()
        return HttpResponse.json(
          {
            contact: {
              email: 'jane@example.com',
              firstName: 'Jane',
              subscribed: true,
              suppressed: false,
              createdAt: 1712592000000,
              updatedAt: 1712592000000,
              customFields: { plan: 'enterprise' },
            },
            created: true,
            fieldsCreated: ['plan'],
            warnings: [],
          },
          { status: 201 }
        )
      })
    )

    const { client } = makeTestHttpClient()
    const upsert = createUpsertContact(client)

    const result = await upsert({
      email: 'jane@example.com',
      firstName: 'Jane',
      customFields: { plan: 'enterprise' },
    })

    expect(capturedRequest?.method).toBe('POST')
    expect(capturedBody).toEqual({
      email: 'jane@example.com',
      firstName: 'Jane',
      customFields: { plan: 'enterprise' },
    })
    expect(result.contact.email).toBe('jane@example.com')
    expect(result.contact.firstName).toBe('Jane')
    expect(result.contact.customFields).toEqual({ plan: 'enterprise' })
    expect(result.created).toBe(true)
    expect(result.fieldsCreated).toEqual(['plan'])
    expect(result.warnings).toEqual([])
  })

  it('auto-attaches an Idempotency-Key header (transport behavior, sanity check at resource layer)', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.post('https://brew.new/api/v1/contacts', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json(
          {
            contact: {
              email: 'jane@example.com',
              subscribed: true,
              suppressed: false,
              createdAt: 1712592000000,
              updatedAt: 1712592000000,
              customFields: {},
            },
            created: true,
            fieldsCreated: [],
            warnings: [],
          },
          { status: 201 }
        )
      })
    )

    const { client } = makeTestHttpClient()
    const upsert = createUpsertContact(client)

    await upsert({ email: 'jane@example.com' })

    expect(capturedRequest?.headers.get('idempotency-key')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    )
  })
})
