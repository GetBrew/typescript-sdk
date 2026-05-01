import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createDeleteManyContacts } from '../../../src/resources/contacts/delete-many'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('contacts.deleteMany', () => {
  it('sends DELETE /v1/contacts with { emails: [...] } body and returns the deletion envelope', async () => {
    let capturedBody: unknown
    server.use(
      http.delete('https://brew.new/api/v1/contacts', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ deleted: 2 })
      })
    )

    const { client } = makeTestHttpClient()
    const deleteMany = createDeleteManyContacts(client)

    const result = await deleteMany({
      emails: ['a@example.com', 'b@example.com'],
    })

    expect(capturedBody).toEqual({
      emails: ['a@example.com', 'b@example.com'],
    })
    expect(result.deleted).toBe(2)
    expect(result.notFound).toBeUndefined()
  })

  it('exposes the optional notFound array when the API surfaces partial misses', async () => {
    server.use(
      http.delete('https://brew.new/api/v1/contacts', () =>
        HttpResponse.json({
          deleted: 1,
          notFound: ['missing@example.com'],
        })
      )
    )

    const { client } = makeTestHttpClient()
    const deleteMany = createDeleteManyContacts(client)

    const result = await deleteMany({
      emails: ['present@example.com', 'missing@example.com'],
    })

    expect(result.deleted).toBe(1)
    expect(result.notFound).toEqual(['missing@example.com'])
  })

  it('returns the full BrewRawResponse when called with { raw: true }', async () => {
    server.use(
      http.delete('https://brew.new/api/v1/contacts', () =>
        HttpResponse.json(
          { deleted: 0, notFound: ['ghost@example.com'] },
          {
            status: 200,
            headers: { 'x-request-id': 'req_raw_delete_many' },
          }
        )
      )
    )
    const { client } = makeTestHttpClient()
    const deleteMany = createDeleteManyContacts(client)

    const raw = await deleteMany(
      { emails: ['ghost@example.com'] },
      { raw: true }
    )

    expect(raw.status).toBe(200)
    expect(raw.requestId).toBe('req_raw_delete_many')
    expect(raw.data.deleted).toBe(0)
    expect(raw.data.notFound).toEqual(['ghost@example.com'])
  })
})
