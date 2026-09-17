import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createGetEmail } from '../../../src/resources/emails/get'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const EMAIL = {
  emailId: 'email_123',
  emailVersionId: 'emv_123_v2',
  title: 'Welcome Email',
  status: 'ready' as const,
  updatedAt: '2026-04-08T12:34:56.789Z',
  group: null,
}

describe('emails.get', () => {
  it('GETs /v1/emails/{emailId} and returns the BARE row', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/emails/email_123', ({ request }) => {
        url = request.url
        return HttpResponse.json(EMAIL)
      })
    )

    const { client } = makeTestHttpClient()
    const email = await createGetEmail(client)('email_123')

    expect(new URL(url!).pathname).toBe('/api/v1/emails/email_123')
    expect(new URL(url!).search).toBe('')
    expect(email.emailId).toBe('email_123')
    // One v1 vocabulary: generating | ready | failed.
    expect(email.status).toBe('ready')
  })

  it('serializes an include array as a single comma string', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/emails/email_123', ({ request }) => {
        url = request.url
        return HttpResponse.json({
          ...EMAIL,
          html: '<!DOCTYPE html><html><body>Hi</body></html>',
          versions: [
            { version: 'latest', emailVersionId: 'emv_123_v2' },
            { version: 1, emailVersionId: 'emv_123_v1' },
          ],
        })
      })
    )

    const { client } = makeTestHttpClient()
    const email = await createGetEmail(client)('email_123', {
      include: ['html', 'versions'],
    })

    expect(new URL(url!).searchParams.getAll('include')).toEqual([
      'html,versions',
    ])
    expect(email.html).toContain('<body>')
    // These emailVersionIds are what `emails.restore` takes in v1.
    expect(email.versions?.[1]?.emailVersionId).toBe('emv_123_v1')
  })

  it('surfaces an unknown id as 404 EMAIL_NOT_FOUND, not an empty page', async () => {
    server.use(
      http.get('https://brew.new/api/v1/emails/:emailId', () =>
        HttpResponse.json(
          {
            error: {
              code: 'EMAIL_NOT_FOUND',
              type: 'not_found',
              message: 'Email email_missing was not found.',
              suggestion: 'List designs with GET /v1/emails.',
              docs: 'https://docs.brew.new/api-reference/api/errors',
            },
          },
          { status: 404 }
        )
      )
    )

    const { client } = makeTestHttpClient()

    await expect(createGetEmail(client)('email_missing')).rejects.toMatchObject(
      { status: 404, code: 'EMAIL_NOT_FOUND' }
    )
  })
})
