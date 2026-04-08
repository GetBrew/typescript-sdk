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
  })
})
