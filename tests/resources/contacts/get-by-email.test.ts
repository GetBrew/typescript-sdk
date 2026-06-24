import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createGetContactByEmail } from '../../../src/resources/contacts/get-by-email'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('contacts.getByEmail', () => {
  it('sends GET /v1/contacts/{email} (email in path) and returns the bare contact', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/contacts/jane%40example.com',
        ({ request }) => {
          capturedRequest = request
          return HttpResponse.json({
            email: 'jane@example.com',
            firstName: 'Jane',
            subscribed: true,
            suppressed: false,
            createdAt: '2026-04-08T12:00:00.000Z',
            updatedAt: '2026-04-08T12:05:00.000Z',
            customFields: { plan: 'enterprise' },
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const getByEmail = createGetContactByEmail(client)

    const contact = await getByEmail({ email: 'jane@example.com' })

    expect(capturedRequest).toBeDefined()
    expect(capturedRequest!.method).toBe('GET')
    const url = new URL(capturedRequest!.url)
    expect(url.pathname).toBe('/api/v1/contacts/jane%40example.com')
    expect(contact.email).toBe('jane@example.com')
    expect(contact.firstName).toBe('Jane')
    expect(contact.createdAt).toBe('2026-04-08T12:00:00.000Z')
    expect(contact.customFields).toEqual({ plan: 'enterprise' })
  })
})
