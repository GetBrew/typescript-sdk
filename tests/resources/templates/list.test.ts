import { http, HttpResponse } from 'msw'
import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  createListTemplates,
  type ListTemplatesInput,
  type TemplatesCountResponse,
  type TemplatesListResponse,
  type TemplateSummaryListResponse,
} from '../../../src/resources/templates/list'
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

  it('forwards the query search and the lean representation', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/templates', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({ data: [], pagination: PAGINATION })
      })
    )

    const { client } = makeTestHttpClient()
    await createListTemplates(client)({
      query: 'product launch',
      representation: 'summary',
    })

    const sent = new URL(capturedRequest!.url)
    expect(sent.searchParams.get('query')).toBe('product launch')
    expect(sent.searchParams.get('representation')).toBe('summary')
  })
})

describe('templates.list representation typing', () => {
  it('returns summary rows, typed without html, for representation: summary', async () => {
    server.use(
      http.get('https://brew.new/api/v1/templates', () =>
        HttpResponse.json({
          data: [
            {
              emailId: 'pt1_vercel_digest',
              title: 'Vercel Frontend Digest',
              previewImage: 'https://cdn.brew.new/pt1_vercel_digest.png',
              updatedAt: '2026-04-08T12:00:00.000Z',
              referenceEmailId: 'pt1_vercel_digest',
              viewUrl: 'https://brew.new/templates/email/pt1_vercel_digest',
            },
          ],
          pagination: PAGINATION,
        })
      )
    )
    const { client } = makeTestHttpClient()
    const list = createListTemplates(client)

    const summary = await list({ representation: 'summary' })

    expectTypeOf(summary).toEqualTypeOf<TemplateSummaryListResponse>()
    expectTypeOf<(typeof summary.data)[number]>().not.toHaveProperty('html')
    expect(summary.data[0]?.viewUrl).toBe(
      'https://brew.new/templates/email/pt1_vercel_digest'
    )
    expect(summary.data[0]?.referenceEmailId).toBe('pt1_vercel_digest')
  })

  it('types full rows by default and the union for a runtime representation', () => {
    const { client } = makeTestHttpClient()
    const list = createListTemplates(client)
    const bare = () => list()
    const full = () => list({ representation: 'full' })
    const dynamic = (representation: 'full' | 'summary') =>
      list({ representation })

    expectTypeOf(bare).returns.resolves.toEqualTypeOf<TemplatesListResponse>()
    expectTypeOf(full).returns.resolves.toEqualTypeOf<TemplatesListResponse>()
    expectTypeOf(dynamic).returns.resolves.toEqualTypeOf<
      TemplatesListResponse | TemplateSummaryListResponse
    >()
    expectTypeOf<
      Awaited<ReturnType<typeof bare>>['data'][number]
    >().toHaveProperty('html')
  })

  it('types counts separately from rows, including raw mode', async () => {
    let capturedRequest: Request | undefined
    const body = {
      count: 42,
      groupBy: 'category',
      groups: [{ value: 'newsletter', count: 42 }],
      pagination: { limit: 20, cursor: null, hasMore: false },
    }
    server.use(
      http.get('https://brew.new/api/v1/templates', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json(body)
      })
    )
    const { client } = makeTestHttpClient()
    const list = createListTemplates(client)
    const counted = await list({ count: true, groupBy: 'category' })
    expectTypeOf(counted).toEqualTypeOf<TemplatesCountResponse>()
    expectTypeOf(counted).not.toHaveProperty('data')
    expect(counted).toEqual(body)
    const url = new URL(capturedRequest!.url)
    expect(url.searchParams.get('count')).toBe('true')
    expect(url.searchParams.get('groupBy')).toBe('category')
    const raw = await list({ count: 'true' }, { raw: true })
    expectTypeOf(raw.data).toEqualTypeOf<TemplatesCountResponse>()
    expect(raw.data.count).toBe(42)
  })

  it('keeps dynamic count queries honest and refuses grouping without counts', () => {
    const { client } = makeTestHttpClient()
    const list = createListTemplates(client)
    const dynamic = (input: ListTemplatesInput) => list(input)
    expectTypeOf(dynamic).returns.resolves.toEqualTypeOf<
      | TemplatesListResponse
      | TemplateSummaryListResponse
      | TemplatesCountResponse
    >()
    const invalid = [
      // @ts-expect-error -- grouping requires count mode
      () => list({ groupBy: 'brand' }),
      // @ts-expect-error -- only grouped counts have a cursor
      () => list({ count: true, cursor: 'next' }),
      // @ts-expect-error -- count mode cannot use semantic ranking
      () => list({ count: true, semantic: 'welcome' }),
      // @ts-expect-error -- count mode cannot use text search
      () => list({ count: true, query: 'welcome' }),
    ]
    expect(invalid).toHaveLength(4)
  })
})
