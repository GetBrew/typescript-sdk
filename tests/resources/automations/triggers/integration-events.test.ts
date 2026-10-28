import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { BrewApiError } from '../../../../src/core/errors'
import { createTriggersResource } from '../../../../src/resources/automations/triggers/resource'
import { makeTestHttpClient } from '../../../helpers/http-client'
import { server } from '../../../msw/server'

const INTEGRATION_EVENTS_URL =
  'https://brew.new/api/v1/automations/triggers/integration-events'

const EVENT_ID = 'k5714pq3vm8x2n6c9d0b7f1h4j6g2r8t'

const SAVED_ROW = {
  triggerEventId: 'posthog:org_2abc:brand_9xyz:ev_3f1c9b2e7a4d8c06b5e1f2a3',
  title: 'created_project',
  provider: 'posthog' as const,
  providerEventKey: 'created_project',
  payloadSchema: {
    type: 'object' as const,
    fields: [{ key: 'email', type: 'string' as const, required: true }],
  },
  createdAt: '2026-10-26T12:00:00.000Z',
  updatedAt: '2026-10-26T12:00:00.000Z',
}

function refusal(code: string, status: number, message: string) {
  return HttpResponse.json(
    { error: { code, type: 'conflict', message } },
    { status }
  )
}

describe('automations.triggers.ensureIntegrationEvent', () => {
  it('POSTs the eventId to /v1/automations/triggers/integration-events and returns the new row', async () => {
    let capturedBody: unknown
    let capturedKey: string | null = null
    server.use(
      http.post(INTEGRATION_EVENTS_URL, async ({ request }) => {
        capturedBody = await request.json()
        capturedKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json(
          { ...SAVED_ROW, created: true },
          { status: 201 }
        )
      })
    )

    const { client } = makeTestHttpClient()
    const result = await createTriggersResource(client).ensureIntegrationEvent({
      eventId: EVENT_ID,
    })

    expect(capturedBody).toEqual({ eventId: EVENT_ID })
    // A POST carries a key so a retry after a lost answer replays.
    expect(capturedKey).toEqual(expect.any(String))
    expect(result).toMatchObject({
      triggerEventId: SAVED_ROW.triggerEventId,
      provider: 'posthog',
      providerEventKey: 'created_project',
      created: true,
    })
  })

  it('returns the existing row with created: false for an event that is already a trigger', async () => {
    server.use(
      http.post(INTEGRATION_EVENTS_URL, () =>
        HttpResponse.json({ ...SAVED_ROW, created: false }, { status: 200 })
      )
    )

    const { client } = makeTestHttpClient()
    const result = await createTriggersResource(client).ensureIntegrationEvent({
      eventId: EVENT_ID,
    })

    expect(result.created).toBe(false)
    expect(result.triggerEventId).toBe(SAVED_ROW.triggerEventId)
  })

  it('sends the caller’s idempotency key', async () => {
    let capturedKey: string | null = null
    server.use(
      http.post(INTEGRATION_EVENTS_URL, ({ request }) => {
        capturedKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json(
          { ...SAVED_ROW, created: true },
          { status: 201 }
        )
      })
    )

    const { client } = makeTestHttpClient()
    await createTriggersResource(client).ensureIntegrationEvent(
      { eventId: EVENT_ID },
      { idempotencyKey: 'ensure-created-project' }
    )

    expect(capturedKey).toBe('ensure-created-project')
  })

  it.each([
    [
      'TRIGGER_LIMIT_REACHED',
      'This brand already holds 100 triggers. Delete an unused one, then retry.',
    ],
    [
      'INTEGRATION_RECONNECT_REQUIRED',
      "The stripe connection no longer holds this event's trigger. Reconnect stripe in Brew, then retry.",
    ],
  ])(
    'surfaces 409 %s as a typed BrewApiError without retrying',
    async (code, message) => {
      let calls = 0
      server.use(
        http.post(INTEGRATION_EVENTS_URL, () => {
          calls += 1
          return refusal(code, 409, message)
        })
      )

      const { client } = makeTestHttpClient()
      const failure = await createTriggersResource(client)
        .ensureIntegrationEvent({ eventId: EVENT_ID })
        .catch((error: unknown) => error)

      expect(failure).toBeInstanceOf(BrewApiError)
      expect(failure).toMatchObject({ status: 409, code, message })
      expect(calls).toBe(1)
    }
  )

  it('answers the raw response with its status on raw: true', async () => {
    server.use(
      http.post(INTEGRATION_EVENTS_URL, () =>
        HttpResponse.json({ ...SAVED_ROW, created: true }, { status: 201 })
      )
    )

    const { client } = makeTestHttpClient()
    const raw = await createTriggersResource(client).ensureIntegrationEvent(
      { eventId: EVENT_ID },
      { raw: true }
    )

    expect(raw.status).toBe(201)
    expect(raw.data.created).toBe(true)
  })
})
