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

const DETAIL = {
  ...CARD,
  anchor: 'signedUpAt',
  steps: [
    {
      order: 1,
      dayOffset: 0,
      delayDays: 0,
      subject: 'Welcome to Notion',
      category: 'welcome',
      categoryLabel: 'Welcome',
      emailId: 'pt1_aaa',
    },
    {
      order: 2,
      dayOffset: 2.1,
      delayDays: 2.1,
      subject: 'Three templates to try',
      category: 'education',
      categoryLabel: 'Education',
      emailId: 'pt1_bbb',
      html: '<html>two</html>',
    },
  ],
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

  it('fetches one flow by slug with include as a comma string, returning steps and no pagination', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/flows', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({ data: [DETAIL] })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListFlows(client)

    const result = await list({ slug: 'notion.com', include: ['html'] })

    const url = new URL(capturedRequest!.url)
    expect(url.searchParams.get('slug')).toBe('notion.com')
    expect(url.searchParams.get('include')).toBe('html')
    expect(result.pagination).toBeUndefined()
    const [flow] = result.data
    expect(flow?.anchor).toBe('signedUpAt')
    expect(flow?.steps?.map((step) => step.emailId)).toEqual([
      'pt1_aaa',
      'pt1_bbb',
    ])
    expect(flow?.steps?.[1]?.html).toBe('<html>two</html>')
  })

  it('accepts include as a comma string too', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/flows', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({ data: [DETAIL] })
      })
    )

    const { client } = makeTestHttpClient()
    await createListFlows(client)({ slug: 'notion.com', include: 'html' })

    expect(new URL(capturedRequest!.url).searchParams.get('include')).toBe(
      'html'
    )
  })

  it('returns the raw response when options.raw is set', async () => {
    server.use(
      http.get('https://brew.new/api/v1/flows', () =>
        HttpResponse.json(
          { data: [CARD], pagination: PAGINATION },
          { headers: { 'x-request-id': 'req_flows_1' } }
        )
      )
    )

    const { client } = makeTestHttpClient()
    const raw = await createListFlows(client)({}, { raw: true })

    expect(raw.status).toBe(200)
    expect(raw.requestId).toBe('req_flows_1')
    expect(raw.data.data[0]?.slug).toBe('notion.com')
  })
})
