import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createPatchContact } from '../../../src/resources/contacts/patch'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('contacts.patch', () => {
  it('sends PATCH /v1/contacts with { email, ...updates } body and unwraps the contact', async () => {
    let capturedRequest: Request | undefined
    let capturedBody: unknown
    server.use(
      http.patch('https://brew.new/api/v1/contacts', async ({ request }) => {
        capturedRequest = request.clone()
        capturedBody = await request.json()
        return HttpResponse.json({
          contact: {
            email: 'jane@example.com',
            firstName: 'Jane',
            customFields: { plan: 'pro' },
          },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const patch = createPatchContact(client)

    const result = await patch({
      email: 'jane@example.com',
      updates: {
        firstName: 'Jane',
        customFields: { plan: 'pro' },
      },
    })

    expect(capturedRequest?.method).toBe('PATCH')
    expect(capturedBody).toEqual({
      email: 'jane@example.com',
      firstName: 'Jane',
      customFields: { plan: 'pro' },
    })
    expect(result.email).toBe('jane@example.com')
    expect(result.firstName).toBe('Jane')
  })
})
