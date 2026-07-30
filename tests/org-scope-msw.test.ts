import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { BrewApiError, createBrewClient } from '../src/index'

import { server } from './msw/server'

const baseUrl = 'https://brew.new/api'
const brandPage = {
  data: [
    {
      brandId: 'brand_1',
      domain: 'acme.example',
      status: 'completed' as const,
      ready: true,
    },
  ],
  pagination: { limit: 1, cursor: 'cursor_2', hasMore: true },
}

function client() {
  return createBrewClient({
    apiKey: 'brew_test_org',
    baseUrl,
    maxRetries: 0,
  })
}

describe('organization-scoped SDK transport', () => {
  it('pins brand resources without mutating the original client', async () => {
    const seen: Array<string | null> = []
    server.use(
      http.get(`${baseUrl}/v1/emails`, ({ request }) => {
        seen.push(request.headers.get('x-brand-id'))
        return HttpResponse.json({
          data: [],
          pagination: { limit: 50, cursor: null, hasMore: false },
        })
      })
    )

    const brew = client()
    const brandOne = brew.withBrand('brand_1')
    const brandTwo = brandOne.withBrand('brand_2')
    await brandOne.emails.list()
    await brandTwo.emails.list()
    await brew.emails.list()

    expect(seen).toEqual(['brand_1', 'brand_2', null])
  })

  it('omits X-Brand-Id from organization-level resources on a pinned client', async () => {
    const seen: Array<[string, string | null]> = []
    server.use(
      http.get(`${baseUrl}/v1/brands`, ({ request }) => {
        seen.push(['brands', request.headers.get('x-brand-id')])
        return HttpResponse.json(brandPage)
      }),
      http.get(`${baseUrl}/v1/templates`, ({ request }) => {
        seen.push(['templates', request.headers.get('x-brand-id')])
        return HttpResponse.json({
          data: [],
          pagination: { limit: 100, cursor: null, hasMore: false },
        })
      }),
      http.get(`${baseUrl}/v1/usage`, ({ request }) => {
        seen.push(['usage', request.headers.get('x-brand-id')])
        return HttpResponse.json({
          plan: { key: 'pro', name: 'Pro' },
          credits: { limit: 100, used: 5, remaining: 95 },
          emailSends: { limit: 1000, used: 10, remaining: 990 },
          period: { start: null, end: null },
        })
      })
    )

    const pinned = client().withBrand('brand_1')
    await pinned.brands.list()
    await pinned.templates.list()
    await pinned.usage.get()

    expect(seen).toEqual([
      ['brands', null],
      ['templates', null],
      ['usage', null],
    ])
  })

  it('serializes brand pagination and status filters', async () => {
    let query = ''
    server.use(
      http.get(`${baseUrl}/v1/brands`, ({ request }) => {
        query = new URL(request.url).search
        return HttpResponse.json(brandPage)
      })
    )

    const result = await client().brands.list({
      limit: 1,
      cursor: 'cursor_1',
      status: 'completed',
    })

    expect(query).toBe('?status=completed&limit=1&cursor=cursor_1')
    expect(result).toEqual(brandPage)
  })

  it('uses the caller idempotency key on create retries', async () => {
    const keys: Array<string | null> = []
    server.use(
      http.post(`${baseUrl}/v1/brands`, ({ request }) => {
        keys.push(request.headers.get('idempotency-key'))
        return HttpResponse.json(
          {
            brand: {
              brandId: 'brand_new',
              domain: 'new.example',
              status: 'extracting',
              ready: false,
            },
            extraction: {
              chatId: 'chat_1',
              statusUrl: '/api/v1/brands/brand_new',
            },
          },
          { status: 201 }
        )
      })
    )

    const brew = client()
    const options = { idempotencyKey: 'create-new-example' }
    await brew.brands.create({ url: 'https://new.example' }, options)
    await brew.brands.create({ url: 'https://new.example' }, options)

    expect(keys).toEqual(['create-new-example', 'create-new-example'])
  })

  it('polls the encoded brand status path until ready', async () => {
    let calls = 0
    server.use(
      http.get(`${baseUrl}/v1/brands/:brandId`, ({ params }) => {
        expect(params.brandId).toBe('brand/slash')
        calls += 1
        return HttpResponse.json({
          brand: {
            brandId: 'brand/slash',
            domain: 'acme.example',
            status: calls === 1 ? 'extracting' : 'completed',
            ready: calls > 1,
          },
        })
      })
    )

    const brew = client()
    const first = await brew.brands.get({ brandId: 'brand/slash' })
    const second = await brew.brands.get({ brandId: 'brand/slash' })

    expect(first.brand.ready).toBe(false)
    expect(second.brand.ready).toBe(true)
  })

  it('preserves public error envelopes from brand lifecycle calls', async () => {
    server.use(
      http.post(`${baseUrl}/v1/brands`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'ORG_SCOPE_REQUIRED',
              type: 'authorization_error',
              message: 'Organization scope required.',
              suggestion: 'Use an organization-scoped API key.',
              docs: 'https://docs.brew.new/api-reference/api/authentication',
            },
          },
          { status: 403, headers: { 'x-request-id': 'req_scope_1' } }
        )
      )
    )

    try {
      await client().brands.create({ url: 'https://new.example' })
      expect.fail('expected organization scope error')
    } catch (error) {
      expect(error).toBeInstanceOf(BrewApiError)
      expect(error).toMatchObject({
        status: 403,
        code: 'ORG_SCOPE_REQUIRED',
        requestId: 'req_scope_1',
      })
    }
  })
})
