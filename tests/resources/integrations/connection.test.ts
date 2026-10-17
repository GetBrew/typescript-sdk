import { HttpResponse, http } from 'msw'
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

import { BrewApiError, BrewConnectionError } from '../../../src/core/errors'
import {
  type BrewClient,
  type ConnectIntegrationInput,
  type ConnectIntegrationResponse,
  createBrewClient,
  type IntegrationConnection,
  type IntegrationConnectionProvider,
  type IntegrationsResource,
} from '../../../src/index'
import { createIntegrationsResource } from '../../../src/resources/integrations/resource'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const BASE = 'https://brew.new/api/v1/integrations'

// A canary: it must reach the request body and nowhere else.
const SIGNING_SECRET = 'v1,whsec_Y2FuYXJ5LXNlY3JldC1uZXZlci1sb2dnZWQ='

const CONNECTION = {
  provider: 'supabase_auth' as const,
  connectionId: 'iac_Q2tX9vL1mB7rN4cP8wZsA',
  webhookUrl:
    'https://brew.new/api/integrations/supabase_auth/webhook/iac_Q2tX9vL1mB7rN4cP8wZsA',
  status: 'pending_verification' as const,
}

const CONNECT_RESULT = {
  ...CONNECTION,
  authEmails: [
    { triggerKey: 'auth.verify-email', ok: true },
    {
      triggerKey: 'auth.magic-link',
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Import failed.' },
    },
  ],
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

describe('integrations.getConnection', () => {
  it('GETs /v1/integrations/{provider}/connection and returns the connection', async () => {
    let captured: Request | undefined
    server.use(
      http.get(`${BASE}/:provider/connection`, ({ request }) => {
        captured = request
        return HttpResponse.json(CONNECTION)
      })
    )

    const { client } = makeTestHttpClient()
    const connection =
      await createIntegrationsResource(client).getConnection('supabase_auth')

    expect(new URL(captured!.url).pathname).toBe(
      '/api/v1/integrations/supabase_auth/connection'
    )
    expect(connection).toEqual(CONNECTION)
  })

  it('returns the raw envelope with { raw: true }', async () => {
    server.use(
      http.get(`${BASE}/clerk/connection`, () =>
        HttpResponse.json(
          { ...CONNECTION, provider: 'clerk', status: 'active' },
          { headers: { 'x-request-id': 'req_conn' } }
        )
      )
    )

    const { client } = makeTestHttpClient()
    const raw = await createIntegrationsResource(client).getConnection(
      'clerk',
      { raw: true }
    )

    expect(raw.status).toBe(200)
    expect(raw.requestId).toBe('req_conn')
    expect(raw.data.status).toBe('active')
  })

  it('surfaces a provider that is not connected as BrewApiError 404 NOT_FOUND', async () => {
    server.use(
      http.get(`${BASE}/:provider/connection`, () => apiError('NOT_FOUND', 404))
    )

    const { client } = makeTestHttpClient()
    const error: unknown = await createIntegrationsResource(client)
      .getConnection('clerk')
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(BrewApiError)
    expect(error).toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })

  it('refuses an empty or dot-segment provider before any request', async () => {
    const { client } = makeTestHttpClient()
    const integrations = createIntegrationsResource(client)
    await Promise.all(
      ['', '.', '..'].map((provider) =>
        expect(
          integrations.getConnection(provider as IntegrationConnectionProvider)
        ).rejects.toBeInstanceOf(TypeError)
      )
    )
  })
})

describe('integrations.connect', () => {
  it('PUTs /v1/integrations/{provider}/connection with the body minus provider, no Idempotency-Key', async () => {
    let body: unknown
    let captured: Request | undefined
    server.use(
      http.put(`${BASE}/:provider/connection`, async ({ request }) => {
        captured = request.clone()
        body = await request.json()
        return HttpResponse.json(CONNECT_RESULT)
      })
    )

    const { client } = makeTestHttpClient()
    const result = await createIntegrationsResource(client).connect({
      provider: 'supabase_auth',
      signingSecret: SIGNING_SECRET,
      settings: { projectUrl: 'https://abcd.supabase.co' },
    })

    expect(captured?.method).toBe('PUT')
    expect(new URL(captured!.url).pathname).toBe(
      '/api/v1/integrations/supabase_auth/connection'
    )
    expect(body).toEqual({
      signingSecret: SIGNING_SECRET,
      settings: { projectUrl: 'https://abcd.supabase.co' },
    })
    // The route never replays (`x-brew-idempotency: none`): connecting is
    // an idempotent PUT, so the transport sends no key.
    expect(captured?.headers.get('idempotency-key')).toBeNull()
    expect(result.webhookUrl).toBe(CONNECTION.webhookUrl)
    expect(result.authEmails[1]).toEqual({
      triggerKey: 'auth.magic-link',
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Import failed.' },
    })
  })

  it('sends only the signing secret when settings is omitted (Clerk)', async () => {
    let body: unknown
    server.use(
      http.put(`${BASE}/clerk/connection`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ ...CONNECT_RESULT, provider: 'clerk' })
      })
    )

    const { client } = makeTestHttpClient()
    await createIntegrationsResource(client).connect({
      provider: 'clerk',
      signingSecret: 'whsec_C2FVsBQIhrscChlQIMV+b5sSYspob7oD',
    })

    expect(body).toEqual({
      signingSecret: 'whsec_C2FVsBQIhrscChlQIMV+b5sSYspob7oD',
    })
  })

  it('retries a 503 (an idempotent PUT) and resolves with the second answer', async () => {
    let attempts = 0
    server.use(
      http.put(`${BASE}/:provider/connection`, () => {
        attempts += 1
        return attempts === 1
          ? apiError('SERVICE_UNAVAILABLE', 503)
          : HttpResponse.json(CONNECT_RESULT)
      })
    )

    const { client } = makeTestHttpClient()
    const result = await createIntegrationsResource(client).connect({
      provider: 'supabase_auth',
      signingSecret: SIGNING_SECRET,
    })

    expect(attempts).toBe(2)
    expect(result.connectionId).toBe(CONNECTION.connectionId)
  })

  it('surfaces 400 INVALID_REQUEST once (never retried)', async () => {
    let attempts = 0
    server.use(
      http.put(`${BASE}/:provider/connection`, () => {
        attempts += 1
        return apiError('INVALID_REQUEST', 400)
      })
    )

    const { client } = makeTestHttpClient()
    const error: unknown = await createIntegrationsResource(client)
      .connect({ provider: 'supabase_auth', signingSecret: 'whsec_wrong' })
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(BrewApiError)
    expect(error).toMatchObject({ status: 400, code: 'INVALID_REQUEST' })
    expect(attempts).toBe(1)
  })

  it('refuses an empty or dot-segment provider before the secret is sent', async () => {
    const { client } = makeTestHttpClient()
    const integrations = createIntegrationsResource(client)
    // No handler: MSW fails any request that goes out.
    await Promise.all(
      ['', '.', '..'].map((provider) =>
        expect(
          integrations.connect({
            provider: provider as IntegrationConnectionProvider,
            signingSecret: SIGNING_SECRET,
          })
        ).rejects.toBeInstanceOf(TypeError)
      )
    )
  })
})

describe('integrations.connect never logs or echoes the signing secret', () => {
  const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug'] as const

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function spyOnConsole() {
    return CONSOLE_METHODS.map((method) =>
      vi.spyOn(console, method).mockImplementation(() => undefined)
    )
  }

  /** Everything an error or a result exposes, as one searchable string. */
  function exposed(value: unknown): string {
    if (value instanceof Error) {
      const fields = Object.fromEntries(
        Object.getOwnPropertyNames(value).map((name) => [
          name,
          (value as unknown as Record<string, unknown>)[name],
        ])
      )
      return [
        String(value),
        value.stack ?? '',
        JSON.stringify(fields),
        exposed(value.cause),
      ].join('\n')
    }
    return JSON.stringify(value) ?? String(value)
  }

  it('sends the secret in the JSON body only: never the URL or a header', async () => {
    let captured: Request | undefined
    let rawBody = ''
    server.use(
      http.put(`${BASE}/:provider/connection`, async ({ request }) => {
        captured = request.clone()
        rawBody = await request.text()
        return HttpResponse.json(CONNECT_RESULT)
      })
    )

    const spies = spyOnConsole()
    const { client } = makeTestHttpClient()
    const result = await createIntegrationsResource(client).connect({
      provider: 'supabase_auth',
      signingSecret: SIGNING_SECRET,
    })

    expect(rawBody).toContain(SIGNING_SECRET)
    expect(captured!.url).not.toContain('whsec_')
    for (const [, value] of captured!.headers) {
      expect(value).not.toContain(SIGNING_SECRET)
    }
    expect(exposed(result)).not.toContain(SIGNING_SECRET)
    for (const spy of spies) expect(spy).not.toHaveBeenCalled()
  })

  it('keeps it out of a BrewApiError, a BrewConnectionError and the raw response', async () => {
    let answer: 'refuse' | 'drop' | 'accept' = 'refuse'
    server.use(
      http.put(`${BASE}/:provider/connection`, () => {
        if (answer === 'drop') return HttpResponse.error()
        if (answer === 'refuse') return apiError('INVALID_REQUEST', 400)
        return HttpResponse.json(CONNECT_RESULT)
      })
    )

    const spies = spyOnConsole()
    const { client } = makeTestHttpClient({
      configOverrides: { maxRetries: 0 },
    })
    const integrations = createIntegrationsResource(client)
    const input = {
      provider: 'supabase_auth',
      signingSecret: SIGNING_SECRET,
    } as const

    const refused: unknown = await integrations
      .connect(input)
      .catch((caught: unknown) => caught)
    expect(refused).toBeInstanceOf(BrewApiError)
    expect(exposed(refused)).not.toContain(SIGNING_SECRET)

    answer = 'drop'
    const dropped: unknown = await integrations
      .connect(input)
      .catch((caught: unknown) => caught)
    expect(dropped).toBeInstanceOf(BrewConnectionError)
    expect(exposed(dropped)).not.toContain(SIGNING_SECRET)

    answer = 'accept'
    const raw = await integrations.connect(input, { raw: true })
    expect(exposed(raw)).not.toContain(SIGNING_SECRET)

    const invalid: unknown = await integrations
      .connect({ ...input, provider: '..' as IntegrationConnectionProvider })
      .catch((caught: unknown) => caught)
    expect(invalid).toBeInstanceOf(TypeError)
    expect(exposed(invalid)).not.toContain(SIGNING_SECRET)

    for (const spy of spies) expect(spy).not.toHaveBeenCalled()
  })
})

describe('brew.integrations on the client', () => {
  it('is a brand-scoped resource: a pinned client sends X-Brand-Id', async () => {
    const brands: Array<string | null> = []
    server.use(
      http.get(`${BASE}/:provider/connection`, ({ request }) => {
        brands.push(request.headers.get('x-brand-id'))
        return HttpResponse.json(CONNECTION)
      }),
      http.put(`${BASE}/:provider/connection`, ({ request }) => {
        brands.push(request.headers.get('x-brand-id'))
        return HttpResponse.json(CONNECT_RESULT)
      })
    )

    const brew = createBrewClient({
      apiKey: 'brew_test_org',
      baseUrl: 'https://brew.new/api',
      maxRetries: 0,
    })
    const acme = brew.withBrand('brand_1')
    await acme.integrations.connect({
      provider: 'supabase_auth',
      signingSecret: SIGNING_SECRET,
    })
    await acme.integrations.getConnection('supabase_auth')

    expect(brands).toEqual(['brand_1', 'brand_1'])
    expect(Object.keys(brew.integrations).sort()).toEqual([
      'connect',
      'getConnection',
      'list',
    ])
  })
})

describe('integrations connection public types', () => {
  it('types the providers, the input and both results', () => {
    expectTypeOf<
      BrewClient['integrations']
    >().toEqualTypeOf<IntegrationsResource>()
    expectTypeOf<IntegrationConnectionProvider>().toEqualTypeOf<
      'supabase_auth' | 'clerk'
    >()
    expectTypeOf<ConnectIntegrationInput>().toHaveProperty('signingSecret')
    expectTypeOf<ConnectIntegrationInput>().toHaveProperty('provider')
    expectTypeOf<IntegrationConnection['status']>().toEqualTypeOf<
      'pending_verification' | 'active'
    >()
    expectTypeOf<ConnectIntegrationResponse>().toHaveProperty('authEmails')
  })
})
