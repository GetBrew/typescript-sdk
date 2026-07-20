import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createCloneEmail } from '../../../src/resources/emails/clone'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('emails.clone', () => {
  it('pins an optional source version and returns the new design', async () => {
    let capturedBody: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/emails/email%2F123/clone',
        async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json(
            {
              emailId: 'email_clone',
              emailVersionId: 'version_clone',
              html: '<html><body>Clone</body></html>',
            },
            { status: 201 }
          )
        }
      )
    )

    const { client } = makeTestHttpClient()
    const clone = createCloneEmail(client)
    const result = await clone({
      emailId: 'email/123',
      emailVersionId: 'version_123',
    })

    expect(capturedBody).toEqual({ emailVersionId: 'version_123' })
    expect(result).toMatchObject({
      emailId: 'email_clone',
      emailVersionId: 'version_clone',
    })
  })
})
