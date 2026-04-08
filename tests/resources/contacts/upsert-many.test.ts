import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createUpsertManyContacts } from '../../../src/resources/contacts/upsert-many'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('contacts.upsertMany', () => {
  it('sends POST /v1/contacts with { contacts: [...] } body and returns the envelope', async () => {
    let capturedBody: unknown
    server.use(
      http.post('https://brew.new/api/v1/contacts', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(
          {
            contacts: [{ email: 'a@example.com' }, { email: 'b@example.com' }],
          },
          { status: 201 }
        )
      })
    )

    const { client } = makeTestHttpClient()
    const upsertMany = createUpsertManyContacts(client)

    const result = await upsertMany({
      contacts: [
        { email: 'a@example.com', firstName: 'A' },
        { email: 'b@example.com', firstName: 'B' },
      ],
    })

    expect(capturedBody).toEqual({
      contacts: [
        { email: 'a@example.com', firstName: 'A' },
        { email: 'b@example.com', firstName: 'B' },
      ],
    })
    expect(result.contacts).toHaveLength(2)
    expect(result.contacts[0]?.email).toBe('a@example.com')
  })
})
