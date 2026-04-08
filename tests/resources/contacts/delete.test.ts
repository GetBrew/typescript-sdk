import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createDeleteContact } from '../../../src/resources/contacts/delete'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('contacts.delete', () => {
  it('sends DELETE /v1/contacts with { email } body and returns the deletion envelope', async () => {
    let capturedRequest: Request | undefined
    let capturedBody: unknown
    server.use(
      http.delete('https://brew.new/api/v1/contacts', async ({ request }) => {
        capturedRequest = request.clone()
        capturedBody = await request.json()
        return HttpResponse.json({ deleted: 1 })
      })
    )

    const { client } = makeTestHttpClient()
    const deleteContact = createDeleteContact(client)

    const result = await deleteContact({ email: 'jane@example.com' })

    expect(capturedRequest?.method).toBe('DELETE')
    expect(capturedBody).toEqual({ email: 'jane@example.com' })
    expect(result.deleted).toBe(1)
  })
})
