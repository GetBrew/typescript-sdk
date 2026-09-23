import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createGetSend } from '../../../src/resources/sends/get'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const sendRow = {
  sendId: 'snd_promo',
  kind: 'campaign',
  emailId: 'eml_promo',
  status: 'completed',
  createdAt: '2026-04-08T12:00:00.000Z',
  updatedAt: '2026-04-08T12:34:56.000Z',
  automationId: 'aut_1',
  nodeId: 'nod_1',
  automationRunId: 'run_1',
  audienceRunId: 'aru_1',
  triggerInstanceId: 'tin_1',
}

describe('sends.get', () => {
  it('GETs /v1/sends/{sendId} and returns the BARE row', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/sends/snd_promo', ({ request }) => {
        url = request.url
        return HttpResponse.json(sendRow)
      })
    )

    const { client } = makeTestHttpClient()
    const send = await createGetSend(client)('snd_promo')

    expect(new URL(url!).pathname).toBe('/api/v1/sends/snd_promo')
    expect(new URL(url!).searchParams.get('include')).toBeNull()
    // Bare row, not `{ data: [row] }`.
    expect(send.sendId).toBe('snd_promo')
    expect(send.automationRunId).toBe('run_1')
    expect(send.triggerInstanceId).toBe('tin_1')
  })

  it('serializes include: "events" and inlines the event page', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/sends/snd_promo', ({ request }) => {
        url = request.url
        return HttpResponse.json({
          ...sendRow,
          events: [
            {
              eventType: 'opened',
              occurredAt: '2026-04-08T12:35:00.000Z',
              recipientEmail: 'reader@example.com',
            },
          ],
        })
      })
    )

    const { client } = makeTestHttpClient()
    const send = await createGetSend(client)('snd_promo', {
      include: 'events',
    })

    expect(new URL(url!).searchParams.get('include')).toBe('events')
    expect(send.events).toHaveLength(1)
    expect(send.events?.[0]?.eventType).toBe('opened')
  })

  it('encodes the id and accepts an include array', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/sends/:sendId', ({ request }) => {
        url = request.url
        return HttpResponse.json(sendRow)
      })
    )

    const { client } = makeTestHttpClient()
    await createGetSend(client)('snd/1', { include: ['events'] })

    expect(new URL(url!).pathname).toBe('/api/v1/sends/snd%2F1')
    expect(new URL(url!).searchParams.get('include')).toBe('events')
  })
})
