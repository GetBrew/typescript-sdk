import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createExportEmail } from '../../../src/resources/emails/export'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('emails.export', () => {
  it('posts the provider options without duplicating emailId in the body', async () => {
    let capturedBody: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/emails/email_123/export',
        async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json({
            emailId: 'email_123',
            provider: 'klaviyo',
            providerName: 'Klaviyo',
            templateName: 'Launch email',
            dryRun: true,
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const exportEmail = createExportEmail(client)
    const result = await exportEmail({
      emailId: 'email_123',
      provider: 'klaviyo',
      templateName: 'Launch email',
      dry_run: true,
    })

    expect(capturedBody).toEqual({
      provider: 'klaviyo',
      templateName: 'Launch email',
      dry_run: true,
    })
    expect(result).toMatchObject({ provider: 'klaviyo', dryRun: true })
  })
})
