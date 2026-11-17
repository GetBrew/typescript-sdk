import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createExportEmail } from '../../../src/resources/emails/export'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('emails.export', () => {
  it.each(['klaviyo', 'loops'] as const)(
    'posts %s options without duplicating emailId in the body',
    async (provider) => {
      let capturedBody: unknown
      server.use(
        http.post(
          'https://brew.new/api/v1/emails/email_123/export',
          async ({ request }) => {
            capturedBody = await request.json()
            return HttpResponse.json({
              emailId: 'email_123',
              provider,
              providerName: provider,
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
        provider,
        templateName: 'Launch email',
        dryRun: true,
      })

      expect(capturedBody).toEqual({
        provider,
        templateName: 'Launch email',
        dryRun: true,
      })
      expect(result).toMatchObject({ provider, dryRun: true })
    }
  )
})
