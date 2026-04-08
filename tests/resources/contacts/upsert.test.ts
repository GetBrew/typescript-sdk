import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createUpsertContact } from '../../../src/resources/contacts/upsert'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('contacts.upsert', () => {
  it('sends POST /v1/contacts with the contact body and unwraps the contact from the envelope', async () => {
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
              customFields: { plan: 'enterprise' },
              createdAt: '2026-04-09T00:00:00.000Z',
              updatedAt: '2026-04-09T00:00:00.000Z',
            },
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
    expect(result.email).toBe('jane@example.com')
    expect(result.firstName).toBe('Jane')
    expect(result.customFields).toEqual({ plan: 'enterprise' })
  })

  it('auto-attaches an Idempotency-Key header (transport behavior, sanity check at resource layer)', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.post('https://brew.new/api/v1/contacts', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json(
          { contact: { email: 'jane@example.com' } },
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
