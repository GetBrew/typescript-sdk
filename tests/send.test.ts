import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { BrewApiError, createBrewClient } from '../src/index'

import { server } from './msw/server'

const baseUrl = 'https://brew.new/api'

function brewClient() {
  return createBrewClient({ apiKey: 'brew_test_send', baseUrl, maxRetries: 0 })
}

function accepted(triggerKey: string) {
  return {
    triggerInstanceId: 'tin_send',
    triggerEventId: 'tri_send',
    triggerKey,
    status: 'triggered',
    automationRunIds: ['run_send'],
    publishedAutomations: [{ automationId: 'auto_send' }],
    counts: { automations: 1, skipped: 0 },
    warnings: [],
    receivedAt: '2026-10-11T12:34:56.789Z',
  }
}

describe('brew.send(key, payload, options?)', () => {
  it('fires the trigger by key with the payload as the body', async () => {
    let body: unknown
    let captured: Request | undefined
    server.use(
      http.post(
        `${baseUrl}/v1/automations/triggers/by-key/auth.password-reset/fire`,
        async ({ request }) => {
          captured = request.clone()
          body = await request.json()
          return HttpResponse.json(accepted('auth.password-reset'), {
            status: 202,
          })
        }
      )
    )

    const result = await brewClient().send('auth.password-reset', {
      email: 'jane@example.com',
      confirmationUrl: 'https://app.example.com/reset?token=abc',
      appName: 'Acme',
    })

    expect(body).toEqual({
      payload: {
        email: 'jane@example.com',
        confirmationUrl: 'https://app.example.com/reset?token=abc',
        appName: 'Acme',
      },
    })
    expect(captured?.headers.get('idempotency-key')).toBeTruthy()
    expect(captured?.headers.get('x-brand-id')).toBeNull()
    expect(result.triggerInstanceId).toBe('tin_send')
    expect(result.triggerKey).toBe('auth.password-reset')
  })

  it('passes options through: idempotencyKey becomes the header', async () => {
    let captured: Request | undefined
    server.use(
      http.post(
        `${baseUrl}/v1/automations/triggers/by-key/order.paid/fire`,
        ({ request }) => {
          captured = request.clone()
          return HttpResponse.json(accepted('order.paid'), { status: 202 })
        }
      )
    )

    await brewClient().send(
      'order.paid',
      { email: 'kim@example.com', orderId: 'ord_1042', total: 42.5 },
      { idempotencyKey: 'order.paid:ord_1042' }
    )

    expect(captured?.headers.get('idempotency-key')).toBe('order.paid:ord_1042')
  })

  it('sends X-Brand-Id from a withBrand client', async () => {
    let brandId: string | null = null
    server.use(
      http.post(
        `${baseUrl}/v1/automations/triggers/by-key/lifecycle.welcome/fire`,
        ({ request }) => {
          brandId = request.headers.get('x-brand-id')
          return HttpResponse.json(accepted('lifecycle.welcome'), {
            status: 202,
          })
        }
      )
    )

    await brewClient()
      .withBrand('brand_acme')
      .send('lifecycle.welcome', { email: 'jane@example.com' })

    expect(brandId).toBe('brand_acme')
  })

  it('rejects with BrewApiError 404 TRIGGER_KEY_NOT_FOUND for an unknown key', async () => {
    server.use(
      http.post(
        `${baseUrl}/v1/automations/triggers/by-key/auth.magic-link/fire`,
        () =>
          HttpResponse.json(
            {
              error: {
                code: 'TRIGGER_KEY_NOT_FOUND',
                type: 'not_found',
                message: 'No trigger in the brand has that key.',
                suggestion: 'Set one up with `npx brew.new init`.',
                docs: 'https://docs.brew.new/api-reference/api/errors',
              },
            },
            { status: 404 }
          )
      )
    )

    const error: unknown = await brewClient()
      .send('auth.magic-link', { email: 'jane@example.com' })
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(BrewApiError)
    expect(error).toMatchObject({ status: 404, code: 'TRIGGER_KEY_NOT_FOUND' })
  })
})
