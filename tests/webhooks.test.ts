import { createHmac } from 'node:crypto'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { createBrewClient } from '../src/client'
import {
  BrewWebhookVerificationError,
  verifyWebhook,
} from '../src/resources/webhooks/verify'
import { server } from './msw/server'
import { startLoopback } from './helpers/loopback-server'

const secret = Buffer.from('a-secret-for-testing-only').toString('base64')
const payload = JSON.stringify({
  type: 'email.delivered',
  created_at: new Date().toISOString(),
  data: {
    email_id: 'email_1',
    to: ['reader@example.com'],
    created_at: new Date().toISOString(),
    brew: { event_id: 'event_1', schema_version: 1 },
  },
})
function signed(
  timestamp = Math.floor(Date.now() / 1000).toString(),
  rawBody = payload
) {
  const id = 'msg_1'
  return {
    id,
    timestamp,
    signature: `v1,${createHmac('sha256', Buffer.from(secret, 'base64')).update(`${id}.${timestamp}.${rawBody}`).digest('base64')}`,
  }
}
describe('webhooks', () => {
  it('verifies a raw signed body received over HTTP and refuses a body changed in transit', async () => {
    const loopback = await startLoopback({
      route: ({ req, res }) => {
        const receive = async () => {
          req.setEncoding('utf8')
          let raw = ''
          for await (const chunk of req) raw += String(chunk)
          const header = (name: string) => {
            const value = req.headers[name]
            return typeof value === 'string' ? value : ''
          }
          try {
            const event = await verifyWebhook({
              payload: raw,
              webhookSecret: `whsec_${secret}`,
              headers: {
                id: header('svix-id'),
                timestamp: header('svix-timestamp'),
                signature: header('svix-signature'),
              },
            })
            res
              .writeHead(200, { 'content-type': 'application/json' })
              .end(JSON.stringify(event))
          } catch (error) {
            res
              .writeHead(
                error instanceof BrewWebhookVerificationError ? 401 : 500
              )
              .end()
          }
        }
        void receive().catch(() => res.writeHead(500).end())
      },
    })
    const headers = signed()
    const requestHeaders = {
      'svix-id': headers.id,
      'svix-timestamp': headers.timestamp,
      'svix-signature': headers.signature,
    }
    const accepted = await fetch(loopback.baseUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: payload,
    })
    expect(accepted.status).toBe(200)
    expect(await accepted.json()).toEqual(JSON.parse(payload))
    expect(
      (
        await fetch(loopback.baseUrl, {
          method: 'POST',
          headers: requestHeaders,
          body: `${payload} `,
        })
      ).status
    ).toBe(401)
  }, 10_000)
  it('rejects valid signatures over invalid events, future timestamps and substituted message IDs', async () => {
    const invalid = JSON.stringify({ type: 'email.unknown', data: {} })
    await expect(
      verifyWebhook({
        payload: invalid,
        headers: signed(undefined, invalid),
        webhookSecret: secret,
      })
    ).rejects.toBeInstanceOf(BrewWebhookVerificationError)
    await expect(
      verifyWebhook({
        payload,
        headers: signed(String(Math.floor(Date.now() / 1000) + 600)),
        webhookSecret: secret,
      })
    ).rejects.toBeInstanceOf(BrewWebhookVerificationError)
    await expect(
      verifyWebhook({
        payload,
        headers: { ...signed(), id: 'substituted_id' },
        webhookSecret: secret,
      })
    ).rejects.toBeInstanceOf(BrewWebhookVerificationError)
  })
  it('routes every resource method through the shared branded transport, including raw responses', async () => {
    const seen: Array<{
      method: string
      path: string
      query: string
      brand: string | null
      body: unknown
    }> = []
    const endpoint = {
      id: 'ep_1',
      endpoint: 'https://example.com/hook',
      events: ['email.delivered'],
      status: 'enabled',
      description: '',
      created_at: new Date().toISOString(),
    }
    server.use(
      http.all(
        /https:\/\/brew\.new\/api\/v1\/webhooks/,
        async ({ request }) => {
          const url = new URL(request.url)
          seen.push({
            method: request.method,
            path: url.pathname,
            query: url.search,
            brand: request.headers.get('X-Brand-Id'),
            body: ['POST', 'PATCH'].includes(request.method)
              ? await request.json()
              : undefined,
          })
          if (url.pathname.endsWith('/rotate-secret'))
            return HttpResponse.json({ signing_secret: 'whsec_rotated' })
          if (
            url.pathname.endsWith('/test') ||
            url.pathname.endsWith('/replay')
          )
            return HttpResponse.json(
              { id: 'msg_1', accepted: true },
              { status: 202 }
            )
          if (
            url.pathname.endsWith('/events') ||
            url.pathname.endsWith('/attempts') ||
            url.pathname === '/api/v1/webhooks'
          ) {
            if (request.method === 'POST')
              return HttpResponse.json(
                { ...endpoint, signing_secret: 'whsec_new' },
                { status: 201 }
              )
            return HttpResponse.json(
              {
                data: [],
                pagination: { limit: 2, hasMore: false, cursor: null },
              },
              { headers: { 'X-Request-Id': 'req_webhook' } }
            )
          }
          if (request.method === 'DELETE')
            return HttpResponse.json({ webhookId: 'ep_1', deleted: true })
          return HttpResponse.json(endpoint)
        }
      )
    )
    const brew = createBrewClient({
      apiKey: 'brew_test',
      brandId: 'base',
    }).withBrand('selected')
    const raw = await brew.webhooks.list(
      { limit: 2, cursor: 'cursor/+' },
      { raw: true }
    )
    expect(raw.status).toBe(200)
    expect(raw.requestId).toBe('req_webhook')
    expect(raw.data.data).toEqual([])
    await brew.webhooks.get('ep_1')
    await brew.webhooks.update({ webhookId: 'ep_1', status: 'disabled' })
    await brew.webhooks.rotateSecret('ep_1')
    await brew.webhooks.events({ webhookId: 'ep_1', limit: 2 })
    await brew.webhooks.attempts({
      webhookId: 'ep_1',
      eventId: 'msg_1',
      cursor: 'next',
    })
    await brew.webhooks.test({ webhookId: 'ep_1', type: 'email.delivered' })
    await brew.webhooks.replay({ webhookId: 'ep_1', eventId: 'msg_1' })
    await brew.webhooks.remove('ep_1')
    expect(seen).toHaveLength(9)
    expect(seen.every((request) => request.brand === 'selected')).toBe(true)
    expect(new URLSearchParams(seen[0]?.query).get('cursor')).toBe('cursor/+')
    expect(seen[2]?.body).toEqual({ status: 'disabled' })
    expect(seen[5]?.path).toBe('/api/v1/webhooks/ep_1/events/msg_1/attempts')
    expect(seen[6]?.body).toEqual({ type: 'email.delivered' })
    expect(seen[7]?.body).toEqual({})
    expect(seen[8]?.method).toBe('DELETE')
  })
  it('verifies Svix signatures over the raw body and rejects tampering and expired signatures', async () => {
    const input = {
      payload,
      headers: signed(),
      webhookSecret: `whsec_${secret}`,
    }
    await expect(verifyWebhook(input)).resolves.toMatchObject({
      type: 'email.delivered',
    })
    await expect(
      verifyWebhook({ ...input, payload: `${payload} ` })
    ).rejects.toBeInstanceOf(BrewWebhookVerificationError)
    await expect(
      verifyWebhook({ ...input, headers: signed('1') })
    ).rejects.toBeInstanceOf(BrewWebhookVerificationError)
    await expect(
      verifyWebhook({ ...input, headers: { ...signed(), signature: '' } })
    ).rejects.toBeInstanceOf(BrewWebhookVerificationError)
  })
  it('accepts any valid signature during signing-secret rotation', async () => {
    const headers = signed()
    await expect(
      verifyWebhook({
        payload,
        headers: { ...headers, signature: `v1,bad ${headers.signature}` },
        webhookSecret: `whsec_${secret}`,
      })
    ).resolves.toMatchObject({ type: 'email.delivered' })
  })
  it('creates a brand-scoped endpoint and keeps replay separate from email sends', async () => {
    const requests: Array<{
      path: string
      brand: string | null
      body: unknown
      key: string | null
    }> = []
    server.use(
      http.post('https://brew.new/api/v1/webhooks', async ({ request }) => {
        requests.push({
          path: new URL(request.url).pathname,
          brand: request.headers.get('X-Brand-Id'),
          body: await request.json(),
          key: request.headers.get('Idempotency-Key'),
        })
        return HttpResponse.json(
          {
            id: 'ep_1',
            endpoint: 'https://example.com/hook',
            events: ['email.delivered'],
            signing_secret: 'whsec_test',
            description: '',
            status: 'enabled',
            created_at: new Date().toISOString(),
          },
          { status: 201 }
        )
      }),
      http.post(
        'https://brew.new/api/v1/webhooks/ep_1/events/msg_1/replay',
        () =>
          HttpResponse.json({ id: 'msg_1', accepted: true }, { status: 202 })
      )
    )
    const brew = createBrewClient({ apiKey: 'brew_test', brandId: 'brand_1' })
    const result = await brew.webhooks.create({
      endpoint: 'https://example.com/hook',
      events: ['email.delivered'],
    })
    expect(result.id).toBe('ep_1')
    expect(requests[0]).toMatchObject({
      brand: 'brand_1',
      body: {
        endpoint: 'https://example.com/hook',
        events: ['email.delivered'],
      },
    })
    expect(requests[0]?.key).toBeTruthy()
    await expect(
      brew.webhooks.replay({ webhookId: 'ep_1', eventId: 'msg_1' })
    ).resolves.toEqual({ id: 'msg_1', accepted: true })
  })
})
