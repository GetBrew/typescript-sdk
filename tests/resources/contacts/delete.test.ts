import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createDeleteContact } from '../../../src/resources/contacts/delete'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('contacts.delete', () => {
  it('sends DELETE /v1/contacts/{email} (email in path) and returns the deletion envelope', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.delete(
        'https://brew.new/api/v1/contacts/jane%40example.com',
        ({ request }) => {
          capturedRequest = request.clone()
          return HttpResponse.json({
            email: 'jane@example.com',
            deleted: true,
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const deleteContact = createDeleteContact(client)

    const result = await deleteContact({ email: 'jane@example.com' })

    expect(capturedRequest?.method).toBe('DELETE')
    expect(new URL(capturedRequest!.url).pathname).toBe(
      '/api/v1/contacts/jane%40example.com'
    )
    expect(result.email).toBe('jane@example.com')
    expect(result.deleted).toBe(true)
  })

  it('is idempotent — an unknown email resolves with { deleted: false }', async () => {
    server.use(
      http.delete('https://brew.new/api/v1/contacts/:email', () =>
        HttpResponse.json({ email: 'ghost@example.com', deleted: false })
      )
    )

    const { client } = makeTestHttpClient()
    const deleteContact = createDeleteContact(client)

    const result = await deleteContact({ email: 'ghost@example.com' })

    expect(result.deleted).toBe(false)
  })
})
