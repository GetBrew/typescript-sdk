import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createTriggersResource } from '../../../../src/resources/automations/triggers/resource'
import { makeTestHttpClient } from '../../../helpers/http-client'
import { server } from '../../../msw/server'

const VALID_PAYLOAD_SCHEMA = {
  type: 'object' as const,
  fields: [{ key: 'email', type: 'string' as const, required: true }],
}

const TRIGGER_ROW = {
  triggerEventId: 'tri_abc',
  title: 'Password Reset',
  provider: 'brew_api' as const,
  payloadSchema: VALID_PAYLOAD_SCHEMA,
  createdAt: '2026-04-08T12:34:56.789Z',
  updatedAt: '2026-04-08T12:34:56.789Z',
}

const PAGINATION = { limit: 100, cursor: null, hasMore: false }

describe('automations.triggers resource — POST/GET/PATCH/DELETE wiring', () => {
  it('create POSTs to /v1/automations/triggers and returns the bare row', async () => {
    let capturedBody: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/automations/triggers',
        async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json(TRIGGER_ROW, { status: 201 })
        }
      )
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
    expect(result.triggerEventId).toBe('tri_abc')
  })

  it('does not surface a `generate` method on the triggers resource (deterministic-only)', () => {
    const { client } = makeTestHttpClient()
    const triggers = createTriggersResource(client)
    expect('generate' in triggers).toBe(false)
  })

  it('list GETs /v1/automations/triggers and returns the { data, pagination } envelope', async () => {
    server.use(
      http.get(
        'https://brew.new/api/v1/automations/triggers',
        ({ request }) => {
          expect(new URL(request.url).search).toBe('')
          return HttpResponse.json({
            data: [TRIGGER_ROW],
            pagination: PAGINATION,
          })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const triggers = createTriggersResource(client)
    const result = await triggers.list()
    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.triggerEventId).toBe('tri_abc')
  })

  it('list with triggerEventId GETs /v1/automations/triggers?triggerEventId and returns the single-row page', async () => {
    let captured: Request | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/automations/triggers',
        ({ request }) => {
          captured = request.clone()
          // Detail mode = single-row page `{ data: [row] }`, no pagination.
          return HttpResponse.json({ data: [TRIGGER_ROW] })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const triggers = createTriggersResource(client)
    // Reads are flat: identity in the query (`?triggerEventId=`).
    const result = await triggers.list({ triggerEventId: 'tri_abc' })
    const url = new URL(captured!.url)
    expect(url.pathname).toBe('/api/v1/automations/triggers')
    expect(url.searchParams.get('triggerEventId')).toBe('tri_abc')
    expect(result.data[0]?.triggerEventId).toBe('tri_abc')
    expect(result.pagination).toBeUndefined()
  })

  it('does not surface enable / disable methods (triggers are always on; gated by automation.published)', () => {
    const { client } = makeTestHttpClient()
    const triggers = createTriggersResource(client)
    expect('enable' in triggers).toBe(false)
    expect('disable' in triggers).toBe(false)
  })

  it('patch PATCHes /v1/automations/triggers/{triggerEventId} with metadata-only fields (no id in body)', async () => {
    let captured: unknown
    server.use(
      http.patch(
        'https://brew.new/api/v1/automations/triggers/tri_abc',
        async ({ request }) => {
          captured = await request.json()
          return HttpResponse.json(TRIGGER_ROW)
        }
      )
    )

    const { client } = makeTestHttpClient()
    const triggers = createTriggersResource(client)
    await triggers.patch({
      triggerEventId: 'tri_abc',
      title: 'New title',
      description: 'Renamed',
    })

    // triggerEventId lives on the URL — only editable fields hit the body.
    expect(captured).toEqual({
      title: 'New title',
      description: 'Renamed',
    })
  })

  it('delete DELETEs /v1/automations/triggers/{triggerEventId} and returns { triggerEventId, deleted }', async () => {
    let captured: Request | undefined
    server.use(
      http.delete(
        'https://brew.new/api/v1/automations/triggers/tri_abc',
        ({ request }) => {
          captured = request.clone()
          return HttpResponse.json({
            triggerEventId: 'tri_abc',
            deleted: true,
          })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const triggers = createTriggersResource(client)
    const result = await triggers.delete({ triggerEventId: 'tri_abc' })
    expect(captured?.method).toBe('DELETE')
    expect(result.deleted).toBe(true)
  })
})
