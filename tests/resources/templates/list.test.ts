import { http, HttpResponse } from 'msw'
import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  createListTemplates,
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
})
