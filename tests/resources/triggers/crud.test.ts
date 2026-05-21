import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createTriggersResource } from '../../../src/resources/triggers/resource'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const VALID_PAYLOAD_SCHEMA = {
  type: 'object' as const,
  fields: [{ key: 'email', type: 'string' as const, required: true }],
}

const TRIGGER_ROW = {
  triggerEventId: 'tri_abc',
  title: 'Password Reset',
  provider: 'brew_api' as const,
  status: 'enabled' as const,
  payloadSchema: VALID_PAYLOAD_SCHEMA,
  createdAt: '2026-04-08T12:34:56.789Z',
  updatedAt: '2026-04-08T12:34:56.789Z',
}

describe('triggers resource — POST/GET/PATCH/DELETE wiring', () => {
  it('create POSTs to /v1/triggers with the deterministic body', async () => {
    let capturedBody: unknown
    server.use(
      http.post('https://brew.new/api/v1/triggers', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ trigger: TRIGGER_ROW }, { status: 201 })
      })
    )

    const { client } = makeTestHttpClient()
    const triggers = createTriggersResource(client)
    const result = await triggers.create({
      title: 'Password Reset',
      payloadSchema: VALID_PAYLOAD_SCHEMA,
    })

    expect(capturedBody).toEqual({
      title: 'Password Reset',
      payloadSchema: VALID_PAYLOAD_SCHEMA,
    })
    expect(result.trigger.triggerEventId).toBe('tri_abc')
  })

  it('does not surface a `generate` method on the triggers resource (deterministic-only)', () => {
    const { client } = makeTestHttpClient()
    const triggers = createTriggersResource(client)
    // The SDK no longer exposes AI generate; chain
    // `brew.triggers.create(...)` with the deterministic shape
    // instead.
    expect('generate' in triggers).toBe(false)
  })

  it('list GETs /v1/triggers (no query)', async () => {
    server.use(
      http.get('https://brew.new/api/v1/triggers', ({ request }) => {
        expect(new URL(request.url).search).toBe('')
        return HttpResponse.json({ triggers: [TRIGGER_ROW] })
      })
    )
    const { client } = makeTestHttpClient()
    const triggers = createTriggersResource(client)
    const result = await triggers.list()
    expect(result.triggers).toHaveLength(1)
  })

  it('get returns a one-element { triggers: [...] } envelope (no fan-out includes)', async () => {
    server.use(
      http.get('https://brew.new/api/v1/triggers', ({ request }) => {
        const params = new URL(request.url).searchParams
        expect(params.get('triggerEventId')).toBe('tri_abc')
        expect(params.get('include')).toBeNull()
        return HttpResponse.json({ triggers: [TRIGGER_ROW] })
      })
    )
    const { client } = makeTestHttpClient()
    const triggers = createTriggersResource(client)
    const result = await triggers.get({ triggerEventId: 'tri_abc' })
    expect(result.triggers).toHaveLength(1)
    expect(result.triggers[0]?.triggerEventId).toBe('tri_abc')
  })

  it('enable / disable sugar both PATCH with the right status field', async () => {
    const captured: Array<{ triggerEventId: string; status: string }> = []
    server.use(
      http.patch('https://brew.new/api/v1/triggers', async ({ request }) => {
        captured.push(
          (await request.json()) as { triggerEventId: string; status: string }
        )
        return HttpResponse.json({ trigger: TRIGGER_ROW })
      })
    )

    const { client } = makeTestHttpClient()
    const triggers = createTriggersResource(client)
    await triggers.enable({ triggerEventId: 'tri_abc' })
    await triggers.disable({ triggerEventId: 'tri_abc' })

    expect(captured).toEqual([
      { triggerEventId: 'tri_abc', status: 'enabled' },
      { triggerEventId: 'tri_abc', status: 'disabled' },
    ])
  })

  it('delete DELETEs /v1/triggers with the id body', async () => {
    let captured: unknown
    server.use(
      http.delete('https://brew.new/api/v1/triggers', async ({ request }) => {
        captured = await request.json()
        return HttpResponse.json({
          triggerEventId: 'tri_abc',
          deletedAt: '2026-04-08T12:34:56.789Z',
          deletedRows: 1,
        })
      })
    )
    const { client } = makeTestHttpClient()
    const triggers = createTriggersResource(client)
    const result = await triggers.delete({ triggerEventId: 'tri_abc' })
    expect(captured).toEqual({ triggerEventId: 'tri_abc' })
    expect(result.deletedRows).toBe(1)
  })
})
