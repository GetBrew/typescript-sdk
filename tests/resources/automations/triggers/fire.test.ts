import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createTriggersResource } from '../../../../src/resources/automations/triggers/resource'
import { makeTestHttpClient } from '../../../helpers/http-client'
import { server } from '../../../msw/server'

describe('automations.triggers.fire', () => {
  it('POSTs /v1/automations/triggers/{triggerEventId}/fire with the { payload } body (id in path)', async () => {
    let body: unknown
    let captured: Request | undefined
    server.use(
      http.post(
        'https://brew.new/api/v1/automations/triggers/tri_x/fire',
        async ({ request }) => {
          captured = request.clone()
          body = await request.json()
          return HttpResponse.json({
            success: true,
            status: 'triggered',
            code: 'TRIGGERED',
            message: 'Trigger fired.',
            triggerEventId: 'tri_x',
            receivedAt: '2026-04-08T12:34:56.789Z',
            details: {
              triggerInstanceId: 'tin_01HZ',
              automationRunIds: ['run_a'],
              counts: { automations: 1, transactionalEmails: 0 },
            },
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const triggers = createTriggersResource(client)
    const result = await triggers.fire({
      triggerEventId: 'tri_x',
      payload: { email: 'jane@example.com' },
    })

    expect(new URL(captured!.url).pathname).toBe(
      '/api/v1/automations/triggers/tri_x/fire'
    )
    // triggerEventId travels on the URL — only the payload hits the body.
    expect(body).toEqual({
      payload: { email: 'jane@example.com' },
    })
    // Fire is retry-safe: the transport auto-attaches an Idempotency-Key.
    expect(captured?.headers.get('idempotency-key')).toBeTruthy()
    expect(result.details?.automationRunIds).toEqual(['run_a'])
    expect(result.status).toBe('triggered')
  })

  it('forwards a caller-supplied idempotencyKey body field', async () => {
    let body: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/automations/triggers/tri_y/fire',
        async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({
            success: true,
            status: 'triggered',
            code: 'TRIGGERED',
            message: 'Trigger fired.',
            triggerEventId: 'tri_y',
            receivedAt: '2026-04-08T12:34:56.789Z',
            details: { automationRunIds: ['run_b'] },
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const triggers = createTriggersResource(client)
    await triggers.fire({
      triggerEventId: 'tri_y',
      payload: { email: 'kim@example.com' },
      idempotencyKey: 'fire-key-001',
    })

    expect(body).toEqual({
      payload: { email: 'kim@example.com' },
      idempotencyKey: 'fire-key-001',
    })
  })
})
