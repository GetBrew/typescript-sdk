import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createListTemplates } from '../../../src/resources/templates/list'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const PAGINATION = { limit: 100, cursor: null, hasMore: false }

describe('templates.list', () => {
  it('sends GET /v1/templates with no filters and returns the { data, pagination } envelope', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/templates', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({
          data: [
            {
              emailId: 'seed-vercel-newsletter',
              title: 'Vercel Frontend Digest',
              html: '<html><body>Frontend digest</body></html>',
              previewImage: 'https://cdn.brew.new/seed-vercel-newsletter.png',
              updatedAt: '2026-04-08T12:00:00.000Z',
            },
          ],
          pagination: PAGINATION,
        })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListTemplates(client)

    const result = await list()

    expect(capturedRequest?.method).toBe('GET')
    expect(new URL(capturedRequest!.url).pathname).toBe('/api/v1/templates')
    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.emailId).toBe('seed-vercel-newsletter')
    expect(result.data[0]?.title).toBe('Vercel Frontend Digest')
  })

  it('serializes brand, category, and semantic filters as query params', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/templates', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({ data: [], pagination: PAGINATION })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListTemplates(client)

    await list({
      brand: 'vercel.com',
      category: 'newsletter',
      semantic: 'frontend',
    })

    const url = new URL(capturedRequest!.url)
    expect(url.searchParams.get('brand')).toBe('vercel.com')
    expect(url.searchParams.get('category')).toBe('newsletter')
    expect(url.searchParams.get('semantic')).toBe('frontend')
  })
})
