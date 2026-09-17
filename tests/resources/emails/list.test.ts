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

  it('serializes status, sortBy, and the from/to window as query params', async () => {
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
      status: 'ready',
      groupId: 'grp_1',
      sortBy: 'createdAt',
      from: '2026-04-10T00:00:00.000Z',
      to: '2026-04-14T00:00:00.000Z',
    })

    const url = new URL(capturedRequest!.url)
    // One v1 vocabulary: generating | ready | failed.
    expect(url.searchParams.get('status')).toBe('ready')
    expect(url.searchParams.get('groupId')).toBe('grp_1')
    expect(url.searchParams.get('sortBy')).toBe('createdAt')
    expect(url.searchParams.get('from')).toBe('2026-04-10T00:00:00.000Z')
    expect(url.searchParams.get('to')).toBe('2026-04-14T00:00:00.000Z')
    // The old createdAt*/updatedAt* window params collapsed into from/to.
    expect(url.searchParams.get('createdAtFrom')).toBeNull()
    expect(url.searchParams.get('updatedAtTo')).toBeNull()
  })

  it('sends no emailId / include filter — the detail read is emails.get', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/emails', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({ data: [], pagination: PAGINATION })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListEmails(client)

    await list({ limit: 10 })

    const url = new URL(capturedRequest!.url)
    expect(url.searchParams.get('emailId')).toBeNull()
    expect(url.searchParams.get('include')).toBeNull()
  })
})
