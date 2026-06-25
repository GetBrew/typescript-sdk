import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createCancel } from '../../../src/resources/sends/cancel'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('sends.cancel', () => {
  it('POSTs /v1/sends/{sendId}/cancel and returns the canceled send', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.post(
        'https://brew.new/api/v1/sends/snd_123/cancel',
        ({ request }) => {
          capturedRequest = request.clone()
          return HttpResponse.json(
            { sendId: 'snd_123', status: 'canceled' },
            { status: 200 }
          )
        }
      )
    )

    const { client } = makeTestHttpClient()
    const cancel = createCancel(client)

    const result = await cancel('snd_123')

    expect(new URL(capturedRequest!.url).pathname).toBe(
      '/api/v1/sends/snd_123/cancel'
    )
    expect(capturedRequest?.method).toBe('POST')
    // No request body — cancel is identified entirely by the URL.
    expect(await capturedRequest!.text()).toBe('')
    // POSTs auto-attach an idempotency key for safe retries.
    expect(capturedRequest?.headers.get('idempotency-key')).toBeTruthy()
    expect(result).toEqual({ sendId: 'snd_123', status: 'canceled' })
  })

  it('encodes the sendId into the path and honors a caller idempotency key', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.post(
        'https://brew.new/api/v1/sends/snd%2Fweird/cancel',
        ({ request }) => {
          capturedRequest = request.clone()
          return HttpResponse.json(
            { sendId: 'snd/weird', status: 'canceled' },
            { status: 200 }
          )
        }
      )
    )

    const { client } = makeTestHttpClient()
    const cancel = createCancel(client)

    const result = await cancel('snd/weird', { idempotencyKey: 'cancel-001' })

    expect(new URL(capturedRequest!.url).pathname).toBe(
      '/api/v1/sends/snd%2Fweird/cancel'
    )
    expect(capturedRequest?.headers.get('idempotency-key')).toBe('cancel-001')
    expect(result).toEqual({ sendId: 'snd/weird', status: 'canceled' })
  })

  it('supports the { raw: true } escape hatch', async () => {
    server.use(
      http.post('https://brew.new/api/v1/sends/snd_456/cancel', () =>
        HttpResponse.json(
          { sendId: 'snd_456', status: 'canceled' },
          { status: 200 }
        )
      )
    )

    const { client } = makeTestHttpClient()
    const cancel = createCancel(client)

    const raw = await cancel('snd_456', { raw: true })

    expect(raw.status).toBe(200)
    expect(raw.data).toEqual({ sendId: 'snd_456', status: 'canceled' })
  })
})
