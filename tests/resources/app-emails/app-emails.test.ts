import { HttpResponse, http } from 'msw'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { BrewApiError } from '../../../src/core/errors'
import {
  type AppEmailKitKey,
  type AppEmailKitResult,
  type AppEmailsResource,
  type BrewClient,
  createBrewClient,
  type UpsertAppEmailInput,
} from '../../../src/index'
import { createAppEmailsResource } from '../../../src/resources/app-emails/resource'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const BASE = 'https://brew.new/api/v1/app-emails'

const ROW = {
  triggerKey: 'auth.password-reset',
  triggerEventId: 'tri_reset',
  title: 'Password reset',
  emailId: 'email_reset',
  automationId: 'auto_reset',
  starterId: 'auth.password-reset',
  starterVersion: 1,
  upgradeAvailable: false,
  published: true,
  sender: { mode: 'sandbox' as const },
  readiness: { ready: true, teamOnly: true, blockers: [] },
  updatedAt: '2026-10-13T12:00:00.000Z',
}

const SETUP_RESULT = {
  triggerKey: 'auth.password-reset',
  triggerEventId: 'tri_reset',
  emailId: 'email_reset',
  emailVersionId: 'ver_1',
  automationId: 'auto_reset',
  published: true,
  created: { trigger: true, email: true, automation: true },
  sender: {
    mode: 'sandbox' as const,
    from: 'acme@sandbox.brew.new',
    sandbox: { dailyLimit: 50, remainingToday: 50 },
  },
  payloadSchema: {
    type: 'object' as const,
    fields: [{ key: 'email', type: 'string' as const, required: true }],
  },
  fireExample: {
    method: 'POST' as const,
    path: '/v1/automations/triggers/by-key/auth.password-reset/fire',
    examplePayload: { email: 'jane@example.com' },
    curl: 'curl -X POST …',
    sdk: "await brew.send('auth.password-reset', { email })",
  },
  warnings: [],
}

const STACK = {
  provider: 'better-auth' as const,
  authDelivery: 'code' as const,
  note: 'Better Auth sends these keys from your code.',
  keys: ['auth.verify-email', 'auth.password-reset'],
  snippets: [{ title: 'auth.ts', file: 'lib/auth.ts', code: '…' }],
}

function apiError(code: string, status: number) {
  return HttpResponse.json(
    {
      error: {
        code,
        type: status === 404 ? 'not_found' : 'invalid_request',
        message: `${code} message`,
        docs: 'https://docs.brew.new/api-reference/api/errors',
      },
    },
    { status }
  )
}

describe('appEmails.list', () => {
  it('GETs /v1/app-emails with no query by default and returns { data, pagination }', async () => {
    let search: string | undefined
    server.use(
      http.get(BASE, ({ request }) => {
        search = new URL(request.url).search
        return HttpResponse.json({
          data: [ROW],
          pagination: { limit: 100, cursor: null, hasMore: false },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const page = await createAppEmailsResource(client).list()

    expect(search).toBe('')
    expect(page.data[0]?.triggerKey).toBe('auth.password-reset')
    expect(page.data[0]?.readiness).toEqual({
      ready: true,
      teamOnly: true,
      blockers: [],
    })
    expect(page.pagination.hasMore).toBe(false)
  })

  it('forwards limit and cursor, and returns the raw envelope with { raw: true }', async () => {
    let params: URLSearchParams | undefined
    server.use(
      http.get(BASE, ({ request }) => {
        params = new URL(request.url).searchParams
        return HttpResponse.json(
          {
            data: [],
            pagination: { limit: 10, cursor: null, hasMore: false },
          },
          { headers: { 'x-request-id': 'req_list' } }
        )
      })
    )

    const { client } = makeTestHttpClient()
    const raw = await createAppEmailsResource(client).list(
      { limit: 10, cursor: 'cur_2' },
      { raw: true }
    )

    expect(params?.get('limit')).toBe('10')
    expect(params?.get('cursor')).toBe('cur_2')
    expect(raw.status).toBe(200)
    expect(raw.requestId).toBe('req_list')
    expect(raw.data.data).toEqual([])
  })
})

describe('appEmails.get', () => {
  it('GETs /v1/app-emails/{triggerKey} (dots stay in the path) and returns the row', async () => {
    let pathname: string | undefined
    server.use(
      http.get(`${BASE}/:key`, ({ request }) => {
        pathname = new URL(request.url).pathname
        return HttpResponse.json(ROW)
      })
    )

    const { client } = makeTestHttpClient()
    const row = await createAppEmailsResource(client).get('auth.password-reset')

    expect(pathname).toBe('/api/v1/app-emails/auth.password-reset')
    expect(row.emailId).toBe('email_reset')
    expect(row.sender.mode).toBe('sandbox')
  })

  it('percent-encodes a key that is not URL-safe', async () => {
    let pathname: string | undefined
    server.use(
      http.get(`${BASE}/:key`, ({ request }) => {
        pathname = new URL(request.url).pathname
        return HttpResponse.json(ROW)
      })
    )

    const { client } = makeTestHttpClient()
    await createAppEmailsResource(client).get('a/b?c')

    expect(pathname).toBe('/api/v1/app-emails/a%2Fb%3Fc')
  })

  it('refuses an empty or dot-segment key before any request', async () => {
    const { client } = makeTestHttpClient()
    const appEmails = createAppEmailsResource(client)
    await Promise.all(
      ['', '.', '..'].map((triggerKey) =>
        expect(appEmails.get(triggerKey)).rejects.toBeInstanceOf(TypeError)
      )
    )
  })

  it('surfaces an unknown key as BrewApiError 404 TRIGGER_KEY_NOT_FOUND', async () => {
    server.use(
      http.get(`${BASE}/:key`, () => apiError('TRIGGER_KEY_NOT_FOUND', 404))
    )

    const { client } = makeTestHttpClient()
    const error: unknown = await createAppEmailsResource(client)
      .get('order.paid')
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(BrewApiError)
    expect(error).toMatchObject({ status: 404, code: 'TRIGGER_KEY_NOT_FOUND' })
  })
})

describe('appEmails.upsert', () => {
  it('PUTs /v1/app-emails/{triggerKey} with the body minus triggerKey, no Idempotency-Key', async () => {
    let body: unknown
    let captured: Request | undefined
    server.use(
      http.put(`${BASE}/:key`, async ({ request }) => {
        captured = request.clone()
        body = await request.json()
        return HttpResponse.json(
          { ...SETUP_RESULT, triggerKey: 'order.shipped' },
          { status: 201 }
        )
      })
    )

    const { client } = makeTestHttpClient()
    const result = await createAppEmailsResource(client).upsert({
      triggerKey: 'order.shipped',
      source: {
        format: 'jsx',
        content: '<Html><Text>{{ trigger.orderId }}</Text></Html>',
      },
      subject: 'Your order shipped',
      payloadSchema: {
        fields: [{ key: 'orderId', type: 'string', required: true }],
      },
      from: { localPart: 'orders', name: 'Acme' },
      publish: true,
    })

    expect(new URL(captured!.url).pathname).toBe(
      '/api/v1/app-emails/order.shipped'
    )
    expect(body).toEqual({
      source: {
        format: 'jsx',
        content: '<Html><Text>{{ trigger.orderId }}</Text></Html>',
      },
      subject: 'Your order shipped',
      payloadSchema: {
        fields: [{ key: 'orderId', type: 'string', required: true }],
      },
      from: { localPart: 'orders', name: 'Acme' },
      publish: true,
    })
    // The route never replays (`x-brew-idempotency: none`): a PUT is an
    // idempotent upsert, so the transport sends no key.
    expect(captured?.headers.get('idempotency-key')).toBeNull()
    expect(result.triggerKey).toBe('order.shipped')
    expect(result.fireExample.sdk).toContain('brew.send')
  })

  it('sends {} for a starter-kit key alone, and a re-run answers 200 (status on raw)', async () => {
    let body: unknown
    server.use(
      http.put(`${BASE}/auth.password-reset`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(
          {
            ...SETUP_RESULT,
            created: { trigger: false, email: false, automation: false },
          },
          { status: 200 }
        )
      })
    )

    const { client } = makeTestHttpClient()
    const raw = await createAppEmailsResource(client).upsert(
      { triggerKey: 'auth.password-reset' },
      { raw: true }
    )

    expect(body).toEqual({})
    expect(raw.status).toBe(200)
    expect(raw.data.created).toEqual({
      trigger: false,
      email: false,
      automation: false,
    })
  })

  it('refuses an empty or dot-segment key before any request', async () => {
    const { client } = makeTestHttpClient()
    const appEmails = createAppEmailsResource(client)
    await Promise.all(
      ['', '.', '..'].map((triggerKey) =>
        expect(appEmails.upsert({ triggerKey })).rejects.toBeInstanceOf(
          TypeError
        )
      )
    )
  })

  it('surfaces 409 APP_EMAIL_EDITED_IN_BREW once (never retried); overwrite: true is sent', async () => {
    const bodies: Array<unknown> = []
    server.use(
      http.put(`${BASE}/lifecycle.welcome`, async ({ request }) => {
        const body = (await request.json()) as { overwrite?: boolean }
        bodies.push(body)
        return body.overwrite === true
          ? HttpResponse.json(SETUP_RESULT)
          : apiError('APP_EMAIL_EDITED_IN_BREW', 409)
      })
    )

    const { client } = makeTestHttpClient()
    const appEmails = createAppEmailsResource(client)
    const error: unknown = await appEmails
      .upsert({ triggerKey: 'lifecycle.welcome', starter: 'lifecycle.welcome' })
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(BrewApiError)
    expect(error).toMatchObject({
      status: 409,
      code: 'APP_EMAIL_EDITED_IN_BREW',
    })
    expect(bodies).toHaveLength(1)

    await appEmails.upsert({
      triggerKey: 'lifecycle.welcome',
      starter: 'lifecycle.welcome',
      overwrite: true,
    })
    expect(bodies[1]).toEqual({
      starter: 'lifecycle.welcome',
      overwrite: true,
    })
  })

  it('surfaces 400 APP_EMAIL_STARTER_UNKNOWN as BrewApiError', async () => {
    server.use(
      http.put(`${BASE}/:key`, () => apiError('APP_EMAIL_STARTER_UNKNOWN', 400))
    )

    const { client } = makeTestHttpClient()
    const error: unknown = await createAppEmailsResource(client)
      .upsert({ triggerKey: 'order.shipped', starter: 'auth.nope' })
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(BrewApiError)
    expect(error).toMatchObject({
      status: 400,
      code: 'APP_EMAIL_STARTER_UNKNOWN',
    })
  })

  it('retries a 503 (an idempotent PUT) and resolves with the second answer', async () => {
    let attempts = 0
    server.use(
      http.put(`${BASE}/:key`, () => {
        attempts += 1
        return attempts === 1
          ? apiError('SERVICE_UNAVAILABLE', 503)
          : HttpResponse.json(SETUP_RESULT)
      })
    )

    const { client } = makeTestHttpClient()
    const result = await createAppEmailsResource(client).upsert({
      triggerKey: 'auth.password-reset',
    })

    expect(attempts).toBe(2)
    expect(result.emailId).toBe('email_reset')
  })
})

describe('appEmails.setUpKit', () => {
  it('POSTs /v1/app-emails/kit with the body and an Idempotency-Key; mixed results come back', async () => {
    let body: unknown
    let captured: Request | undefined
    server.use(
      http.post(`${BASE}/kit`, async ({ request }) => {
        captured = request.clone()
        body = await request.json()
        return HttpResponse.json({
          results: [
            { ...SETUP_RESULT, ok: true },
            {
              triggerKey: 'auth.verify-email',
              ok: false,
              error: {
                code: 'TRIGGER_LIMIT_REACHED',
                message:
                  'The brand already holds the maximum number of trigger events.',
              },
            },
          ],
          stack: STACK,
        })
      })
    )

    const { client } = makeTestHttpClient()
    const kit = await createAppEmailsResource(client).setUpKit({
      sets: ['auth', 'lifecycle'],
      stack: 'better-auth',
      domainId: 'dom_1',
      overwrite: false,
    })

    expect(body).toEqual({
      sets: ['auth', 'lifecycle'],
      stack: 'better-auth',
      domainId: 'dom_1',
      overwrite: false,
    })
    expect(captured?.headers.get('idempotency-key')).toBeTruthy()
    expect(kit.stack.provider).toBe('better-auth')
    const [first, second] = kit.results
    expect(first?.ok).toBe(true)
    // The union narrows on `ok`.
    if (second?.ok === false) {
      expect(second.error.code).toBe('TRIGGER_LIMIT_REACHED')
    } else {
      throw new Error('expected the second key to fail')
    }
  })

  it('sends {} with no input and carries a caller idempotencyKey; exact keys pass through', async () => {
    const seen: Array<{ body: unknown; key: string | null }> = []
    server.use(
      http.post(`${BASE}/kit`, async ({ request }) => {
        seen.push({
          body: await request.json(),
          key: request.headers.get('idempotency-key'),
        })
        return HttpResponse.json({ results: [], stack: STACK })
      })
    )

    const { client } = makeTestHttpClient()
    const appEmails = createAppEmailsResource(client)
    await appEmails.setUpKit(undefined, { idempotencyKey: 'kit-1' })
    await appEmails.setUpKit({ keys: ['auth.otp', 'lifecycle.welcome'] })

    expect(seen[0]).toEqual({ body: {}, key: 'kit-1' })
    expect(seen[1]?.body).toEqual({ keys: ['auth.otp', 'lifecycle.welcome'] })
  })

  it('surfaces a whole-call refusal as BrewApiError', async () => {
    server.use(http.post(`${BASE}/kit`, () => apiError('INVALID_REQUEST', 400)))

    const { client } = makeTestHttpClient()
    const error: unknown = await createAppEmailsResource(client)
      .setUpKit({ sets: ['auth'] })
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(BrewApiError)
    expect(error).toMatchObject({ status: 400, code: 'INVALID_REQUEST' })
  })
})

describe('brew.appEmails on the client', () => {
  it('is a brand-scoped resource: a pinned client sends X-Brand-Id', async () => {
    const brands: Array<string | null> = []
    server.use(
      http.get(BASE, ({ request }) => {
        brands.push(request.headers.get('x-brand-id'))
        return HttpResponse.json({
          data: [],
          pagination: { limit: 100, cursor: null, hasMore: false },
        })
      })
    )

    const brew = createBrewClient({
      apiKey: 'brew_test_org',
      baseUrl: 'https://brew.new/api',
      maxRetries: 0,
    })
    await brew.withBrand('brand_1').appEmails.list()

    expect(brands).toEqual(['brand_1'])
    expect(Object.keys(brew.appEmails).sort()).toEqual([
      'get',
      'list',
      'setUpKit',
      'upsert',
    ])
  })
})

describe('appEmails public types', () => {
  it('types the method signatures the CLI builds on', () => {
    expectTypeOf<BrewClient['appEmails']>().toEqualTypeOf<AppEmailsResource>()
    expectTypeOf<UpsertAppEmailInput>().toHaveProperty('triggerKey')
    expectTypeOf<'auth.password-reset'>().toExtend<AppEmailKitKey>()
    expectTypeOf<'order.paid'>().not.toExtend<AppEmailKitKey>()
    expectTypeOf<Extract<AppEmailKitResult, { ok: false }>>().toHaveProperty(
      'error'
    )
    expectTypeOf<Extract<AppEmailKitResult, { ok: true }>>().toHaveProperty(
      'fireExample'
    )
  })
})
