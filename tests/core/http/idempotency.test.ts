import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('http.request — idempotency key propagation', () => {
  let capturedRequest: Request | undefined

  beforeEach(() => {
    capturedRequest = undefined
  })

  it.each(['', '   ', '\t', 'x'.repeat(101), 'invalid\nkey'])(
    'rejects invalid caller keys before attempting a mutation: %j',
    async (idempotencyKey) => {
      let calls = 0
      server.use(
        http.post('https://brew.new/api/v1/contacts', () => {
          calls += 1
          return HttpResponse.error()
        })
      )
      const { client, sleepCalls } = makeTestHttpClient()
      await expect(
        client.request({
          method: 'POST',
          path: '/v1/contacts',
          options: { idempotencyKey },
        })
      ).rejects.toMatchObject({
        name: 'BrewInputError',
        param: 'idempotencyKey',
      })
      expect(calls).toBe(0)
      expect(sleepCalls).toEqual([])
    }
  )

  it('uses the normalized key on every retry', async () => {
    const keys: Array<string | null> = []
    server.use(
      http.post('https://brew.new/api/v1/contacts', ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'))
        return keys.length === 1
          ? HttpResponse.error()
          : HttpResponse.json({ ok: true })
      })
    )
    const { client } = makeTestHttpClient()
    await client.request({
      method: 'POST',
      path: '/v1/contacts',
      options: { idempotencyKey: ' stable-key ' },
    })
    expect(keys).toEqual(['stable-key', 'stable-key'])
  })

  it('auto-generates an Idempotency-Key header on POST', async () => {
    server.use(
      http.post('https://brew.new/api/v1/contacts', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({ ok: true }, { status: 201 })
      })
    )

    const { client } = makeTestHttpClient()
    await client.request({
      method: 'POST',
      path: '/v1/contacts',
      body: { email: 'jane@example.com' },
    })

    const headerValue = capturedRequest?.headers.get('idempotency-key')
    expect(headerValue).toMatch(UUID_V4_REGEX)
  })

  it('uses a caller-provided Idempotency-Key verbatim on POST', async () => {
    server.use(
      http.post('https://brew.new/api/v1/contacts', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({ ok: true }, { status: 201 })
      })
    )

    const { client } = makeTestHttpClient()
    await client.request({
      method: 'POST',
      path: '/v1/contacts',
      body: { email: 'jane@example.com' },
      options: { idempotencyKey: 'idem_caller_xyz' },
    })

    expect(capturedRequest?.headers.get('idempotency-key')).toBe(
      'idem_caller_xyz'
    )
  })

  it('does NOT send Idempotency-Key on GET even when one is passed', async () => {
    server.use(
      http.get('https://brew.new/api/v1/contacts', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({ contacts: [] })
      })
    )

    const { client } = makeTestHttpClient()
    await client.request({
      method: 'GET',
      path: '/v1/contacts',
      options: { idempotencyKey: 'idem_should_be_ignored' },
    })

    expect(capturedRequest?.headers.get('idempotency-key')).toBeNull()
  })
})
