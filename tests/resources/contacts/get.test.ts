import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createGetContact } from '../../../src/resources/contacts/get'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const CONTACT = {
  email: 'jane+brew@example.com',
  firstName: 'Jane',
  subscribed: true,
  createdAt: '2026-04-08T12:00:00.000Z',
  updatedAt: '2026-04-08T12:00:00.000Z',
}

describe('contacts.get', () => {
  it('GETs /v1/contacts/{email} with the address URL-encoded and returns the BARE row', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/contacts/:email', ({ request }) => {
        url = request.url
        return HttpResponse.json(CONTACT)
      })
    )

    const { client } = makeTestHttpClient()
    const contact = await createGetContact(client)('jane+brew@example.com')

    expect(new URL(url!).pathname).toBe(
      '/api/v1/contacts/jane%2Bbrew%40example.com'
    )
    expect(contact.email).toBe('jane+brew@example.com')
    expect(contact.subscribed).toBe(true)
  })

  it('surfaces an unknown address as 404 CONTACT_NOT_FOUND, not an empty page', async () => {
    server.use(
      http.get('https://brew.new/api/v1/contacts/:email', () =>
        HttpResponse.json(
          {
            error: {
              code: 'CONTACT_NOT_FOUND',
              type: 'not_found',
              message: 'No contact with that email.',
              suggestion: 'List contacts with GET /v1/contacts.',
              docs: 'https://docs.brew.new/api-reference/api/errors',
            },
          },
          { status: 404 }
        )
      )
    )

    const { client } = makeTestHttpClient()

    await expect(
      createGetContact(client)('ghost@example.com')
    ).rejects.toMatchObject({ status: 404, code: 'CONTACT_NOT_FOUND' })
  })
})
