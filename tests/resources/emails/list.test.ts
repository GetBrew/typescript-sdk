import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createListEmails } from '../../../src/resources/emails/list'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const PAGINATION = { limit: 100, cursor: null, hasMore: false }

describe('emails.list', () => {
  it('sends GET /v1/emails and returns the { data, pagination } envelope', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/emails', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({
          data: [
            {
              emailId: 'email_123',
              emailVersionId: 'emv_123_v1',
              title: 'Welcome Email',
            },
          ],
          pagination: PAGINATION,
        })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListEmails(client)

    const result = await list()

    expect(capturedRequest?.method).toBe('GET')
    expect(new URL(capturedRequest!.url).pathname).toBe('/api/v1/emails')
    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.emailId).toBe('email_123')
    expect(result.data[0]?.title).toBe('Welcome Email')
  })

  it('serializes status and date filters as query params', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/emails', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({ data: [], pagination: PAGINATION })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListEmails(client)

    await list({
      status: 'complete',
      createdAtFrom: '2026-04-10T00:00:00.000Z',
      updatedAtTo: '2026-04-14T00:00:00.000Z',
    })

    const url = new URL(capturedRequest!.url)
    expect(url.searchParams.get('status')).toBe('complete')
    expect(url.searchParams.get('createdAtFrom')).toBe(
      '2026-04-10T00:00:00.000Z'
    )
    expect(url.searchParams.get('updatedAtTo')).toBe('2026-04-14T00:00:00.000Z')
  })
})
