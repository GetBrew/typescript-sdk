import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createGetContactByEmail } from '../../../src/resources/contacts/get-by-email'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('contacts.getByEmail', () => {
  it('sends GET /v1/contacts with the email query param and unwraps the envelope', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/contacts', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({
          contact: {
            email: 'jane@example.com',
            firstName: 'Jane',
            subscribed: true,
            suppressed: false,
            createdAt: 1712592000000,
            updatedAt: 1712592300000,
            customFields: { plan: 'enterprise' },
          },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const getByEmail = createGetContactByEmail(client)

    const contact = await getByEmail({ email: 'jane@example.com' })

    expect(capturedRequest).toBeDefined()
    expect(capturedRequest!.method).toBe('GET')
    const url = new URL(capturedRequest!.url)
    expect(url.pathname).toBe('/api/v1/contacts')
    expect(url.searchParams.get('email')).toBe('jane@example.com')
    expect(contact.email).toBe('jane@example.com')
    expect(contact.firstName).toBe('Jane')
    expect(contact.createdAt).toBe(1712592000000)
    expect(contact.customFields).toEqual({ plan: 'enterprise' })
  })
})
