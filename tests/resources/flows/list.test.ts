import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createListFlows } from '../../../src/resources/flows/list'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const PAGINATION = { limit: 100, cursor: null, hasMore: false }

const CARD = {
  slug: 'notion.com',
  brand: { name: 'Notion' },
  title: 'Notion onboarding flow',
  type: 'signup',
  category: 'welcome',
  categoryLabel: 'Welcome',
  emailCount: 2,
  spanDays: 2.1,
  remixCount: 4,
  previewImages: ['https://cdn.brew.new/p1.png'],
  publishedAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-02T12:00:00.000Z',
}

describe('flows.list', () => {
  it('sends GET /v1/flows with no filters and returns the { data, pagination } envelope', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/flows', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({ data: [CARD], pagination: PAGINATION })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListFlows(client)

    const result = await list()

    expect(capturedRequest?.method).toBe('GET')
    const url = new URL(capturedRequest!.url)
    expect(url.pathname).toBe('/api/v1/flows')
    expect(url.search).toBe('')
    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.slug).toBe('notion.com')
    expect(result.data[0]?.brand.name).toBe('Notion')
    expect(result.data[0]?.steps).toBeUndefined()
    expect(result.pagination).toEqual(PAGINATION)
  })

  it('serializes the list filters, sort, and pagination as query params', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/flows', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({ data: [], pagination: PAGINATION })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListFlows(client)

    await list({
      brand: 'notion.com',
      category: 'welcome',
      type: 'signup',
      semantic: 'developer onboarding drip',
      sort: 'emails',
      limit: 5,
      cursor: 'cursor_1',
    })

    const url = new URL(capturedRequest!.url)
    expect(url.searchParams.get('brand')).toBe('notion.com')
    expect(url.searchParams.get('category')).toBe('welcome')
    expect(url.searchParams.get('type')).toBe('signup')
    expect(url.searchParams.get('semantic')).toBe('developer onboarding drip')
    expect(url.searchParams.get('sort')).toBe('emails')
    expect(url.searchParams.get('limit')).toBe('5')
    expect(url.searchParams.get('cursor')).toBe('cursor_1')
    expect(url.searchParams.has('include')).toBe(false)
  })
})
