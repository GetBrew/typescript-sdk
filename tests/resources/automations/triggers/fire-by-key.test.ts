import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { BrewApiError } from '../../../../src/core/errors'
import { createTriggersResource } from '../../../../src/resources/automations/triggers/resource'
import { makeTestHttpClient } from '../../../helpers/http-client'
import { server } from '../../../msw/server'

const BY_KEY = 'https://brew.new/api/v1/automations/triggers/by-key'

function accepted(overrides: Record<string, unknown> = {}) {
  return {
    triggerInstanceId: 'tin_01HZ',
    triggerEventId: 'tri_reset',
    triggerKey: 'auth.password-reset',
    status: 'triggered',
    automationRunIds: ['run_a'],
    publishedAutomations: [{ automationId: 'auto_reset' }],
    counts: { automations: 1, skipped: 0 },
    warnings: [],
    receivedAt: '2026-10-11T12:34:56.789Z',
    ...overrides,
  }
}

describe('automations.triggers.fireByKey', () => {
  it('POSTs /v1/automations/triggers/by-key/{triggerKey}/fire with the { payload } body (dotted key in path)', async () => {
    let body: unknown
    let captured: Request | undefined
    server.use(
      http.post(`${BY_KEY}/auth.password-reset/fire`, async ({ request }) => {
        captured = request.clone()
        body = await request.json()
        return HttpResponse.json(accepted(), { status: 202 })
      })
    )

    const { client } = makeTestHttpClient()
    const triggers = createTriggersResource(client)
    const result = await triggers.fireByKey({
      triggerKey: 'auth.password-reset',
      payload: {
        email: 'jane@example.com',
        confirmationUrl: 'https://app.example.com/reset?t=abc',
      },
    })

    expect(new URL(captured!.url).pathname).toBe(
      '/api/v1/automations/triggers/by-key/auth.password-reset/fire'
    )
    // The key travels on the URL; only the payload is in the body.
    expect(body).toEqual({
      payload: {
        email: 'jane@example.com',
        confirmationUrl: 'https://app.example.com/reset?t=abc',
      },
    })
    // Retry-safe like fire: the transport attaches an Idempotency-Key.
    expect(captured?.headers.get('idempotency-key')).toBeTruthy()
    expect(result.triggerKey).toBe('auth.password-reset')
    expect(result.triggerEventId).toBe('tri_reset')
    expect(result.automationRunIds).toEqual(['run_a'])
  })

  it('percent-encodes a key that is not URL-safe instead of splicing it into the path', async () => {
    let pathname: string | undefined
    server.use(
      http.post(`${BY_KEY}/:key/fire`, ({ request }) => {
        pathname = new URL(request.url).pathname
        return HttpResponse.json(accepted(), { status: 202 })
      })
    )

    const { client } = makeTestHttpClient()
    await createTriggersResource(client).fireByKey({
      triggerKey: 'a/b?c',
      payload: { email: 'jane@example.com' },
    })

    expect(pathname).toBe('/api/v1/automations/triggers/by-key/a%2Fb%3Fc/fire')
  })

  it('refuses an empty or dot-segment key before any request', async () => {
    const { client } = makeTestHttpClient()
    const triggers = createTriggersResource(client)
    await Promise.all(
      ['', '.', '..'].map((triggerKey) =>
        expect(
          triggers.fireByKey({ triggerKey, payload: { email: 'a@b.co' } })
        ).rejects.toBeInstanceOf(TypeError)
      )
    )
  })

  it('carries a caller-supplied idempotencyKey as the header and returns a replay', async () => {
    let captured: Request | undefined
    server.use(
      http.post(`${BY_KEY}/order.paid/fire`, ({ request }) => {
        captured = request.clone()
        return HttpResponse.json(
          accepted({ triggerKey: 'order.paid', status: 'replayed' }),
          { status: 200 }
        )
      })
    )

    const { client } = makeTestHttpClient()
    const result = await createTriggersResource(client).fireByKey(
      { triggerKey: 'order.paid', payload: { email: 'kim@example.com' } },
      { idempotencyKey: 'ord_1042' }
    )

    expect(captured?.headers.get('idempotency-key')).toBe('ord_1042')
    expect(result.status).toBe('replayed')
  })

  it('returns the raw envelope with { raw: true }', async () => {
    server.use(
      http.post(`${BY_KEY}/order.paid/fire`, () =>
        HttpResponse.json(accepted({ triggerKey: 'order.paid' }), {
          status: 202,
          headers: { 'x-request-id': 'req_raw' },
        })
      )
    )

    const { client } = makeTestHttpClient()
    const raw = await createTriggersResource(client).fireByKey(
      { triggerKey: 'order.paid', payload: { email: 'kim@example.com' } },
      { raw: true }
    )

    expect(raw.status).toBe(202)
    expect(raw.requestId).toBe('req_raw')
    expect(raw.data.triggerKey).toBe('order.paid')
  })

  it('surfaces an unknown key as BrewApiError 404 TRIGGER_KEY_NOT_FOUND', async () => {
    server.use(
      http.post(`${BY_KEY}/auth.missing/fire`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'TRIGGER_KEY_NOT_FOUND',
              type: 'not_found',
              message: 'No trigger in the brand has that key.',
              suggestion:
                'List triggers with GET /v1/automations/triggers and check each row’s `key`.',
              docs: 'https://docs.brew.new/api-reference/api/errors',
            },
          },
          { status: 404 }
        )
      )
    )

    const { client } = makeTestHttpClient()
    const error: unknown = await createTriggersResource(client)
      .fireByKey({
        triggerKey: 'auth.missing',
        payload: { email: 'jane@example.com' },
      })
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(BrewApiError)
    expect(error).toMatchObject({ status: 404, code: 'TRIGGER_KEY_NOT_FOUND' })
  })
})
