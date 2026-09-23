import { HttpResponse, http } from 'msw'
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
          return HttpResponse.json(
            {
              triggerInstanceId: 'tin_01HZ',
              triggerEventId: 'tri_x',
              status: 'triggered',
              automationRunIds: ['run_a'],
              publishedAutomations: [{ automationId: 'auto_abc' }],
              counts: { automations: 1, skipped: 0 },
              warnings: [],
              receivedAt: '2026-04-08T12:34:56.789Z',
            },
            { status: 202 }
          )
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
    // v1 answers the BARE accepted body — no { success, code, message,
    // details } envelope wrapped around it.
    expect(result.automationRunIds).toEqual(['run_a'])
    expect(result.triggerInstanceId).toBe('tin_01HZ')
    expect(result.counts.automations).toBe(1)
    expect(result.status).toBe('triggered')
  })

  it('carries a caller-supplied idempotencyKey as the header, not a body field', async () => {
    let body: unknown
    let captured: Request | undefined
    server.use(
      http.post(
        'https://brew.new/api/v1/automations/triggers/tri_y/fire',
        async ({ request }) => {
          captured = request.clone()
          body = await request.json()
          return HttpResponse.json(
            {
              triggerInstanceId: 'tin_02',
              triggerEventId: 'tri_y',
              status: 'replayed',
              automationRunIds: ['run_b'],
              publishedAutomations: [],
              counts: { automations: 1, skipped: 0 },
              warnings: [],
              receivedAt: '2026-04-08T12:34:56.789Z',
            },
            { status: 202 }
          )
        }
      )
    )

    const { client } = makeTestHttpClient()
    const triggers = createTriggersResource(client)
    const result = await triggers.fire(
      {
        triggerEventId: 'tri_y',
        payload: { email: 'kim@example.com' },
      },
      { idempotencyKey: 'fire-key-001' }
    )

    expect(body).toEqual({ payload: { email: 'kim@example.com' } })
    expect(captured?.headers.get('idempotency-key')).toBe('fire-key-001')
    expect(result.status).toBe('replayed')
  })
})
