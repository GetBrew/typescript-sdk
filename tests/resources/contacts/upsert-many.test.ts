import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createUpsertManyContacts } from '../../../src/resources/contacts/upsert-many'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('contacts.upsertMany', () => {
  it('sends POST /v1/contacts with { contacts: [...] } body and returns the batch summary envelope', async () => {
    let capturedBody: unknown
    server.use(
      http.post('https://brew.new/api/v1/contacts', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(
          {
            summary: { inserted: 1, updated: 1, failed: 0 },
            fieldsCreated: [],
            errors: [],
            warnings: [],
          },
          { status: 200 }
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
    expect(result.summary.inserted).toBe(1)
    expect(result.summary.updated).toBe(1)
    expect(result.summary.failed).toBe(0)
    expect(result.errors).toEqual([])
  })

  it('returns per-row errors on a 207 partial-failure response', async () => {
    server.use(
      http.post('https://brew.new/api/v1/contacts', () => {
        return HttpResponse.json(
          {
            summary: { inserted: 1, updated: 0, failed: 1 },
            fieldsCreated: [],
            errors: [
              {
                email: 'bad-email',
                code: 'INVALID_EMAIL',
                message: 'Not a valid email',
              },
            ],
            warnings: [],
          },
          { status: 207 }
        )
      })
    )

    const { client } = makeTestHttpClient()
    const upsertMany = createUpsertManyContacts(client)

    const result = await upsertMany({
      contacts: [{ email: 'a@example.com' }, { email: 'bad-email' }],
    })

    expect(result.summary.failed).toBe(1)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.email).toBe('bad-email')
    expect(result.errors[0]?.code).toBe('INVALID_EMAIL')
  })
})
