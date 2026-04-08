import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { BrewApiError } from '../../../src/core/errors'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('http.request — retry behavior', () => {
  it('retries 503 twice then succeeds on the third attempt', async () => {
    let callCount = 0
    server.use(
      http.get('https://brew.new/api/v1/contacts', () => {
        callCount++
        if (callCount < 3) {
          return new HttpResponse(null, { status: 503 })
        }
        return HttpResponse.json({ contacts: [] })
      })
    )

    const { client } = makeTestHttpClient({
      configOverrides: { maxRetries: 2 },
    })
    const result = await client.request<{ contacts: Array<unknown> }>({
      method: 'GET',
      path: '/v1/contacts',
    })

    expect(callCount).toBe(3)
    expect(result.data).toEqual({ contacts: [] })
  })

  it('does NOT retry a 400 (bad request)', async () => {
    let callCount = 0
    server.use(
      http.get('https://brew.new/api/v1/contacts', () => {
        callCount++
        return HttpResponse.json(
          {
            error: {
              code: 'INVALID_REQUEST',
              type: 'invalid_request',
              message: 'bad email',
              suggestion: 'Fix the email and retry.',
              docs: 'https://docs.getbrew.io/api/contacts#errors',
            },
          },
          { status: 400 }
        )
      })
    )

    const { client } = makeTestHttpClient({
      configOverrides: { maxRetries: 5 },
    })

    await expect(
      client.request({ method: 'GET', path: '/v1/contacts' })
    ).rejects.toBeInstanceOf(BrewApiError)

    expect(callCount).toBe(1)
  })

  it('does NOT retry PATCH 500 — PATCH is never retried, even when a key is attached', async () => {
    let callCount = 0
    server.use(
      http.patch('https://brew.new/api/v1/contacts', () => {
        callCount++
        return HttpResponse.json(
          {
            error: {
              code: 'INTERNAL_ERROR',
              type: 'internal_error',
              message: 'boom',
              suggestion: 'Retry. If it keeps failing, contact support.',
              docs: 'https://docs.getbrew.io/api/contacts#errors',
            },
          },
          { status: 500 }
        )
      })
    )

    const { client } = makeTestHttpClient({
      configOverrides: { maxRetries: 3 },
    })

    await expect(
      client.request({
        method: 'PATCH',
        path: '/v1/contacts',
        body: { email: 'jane@example.com' },
      })
    ).rejects.toBeInstanceOf(BrewApiError)

    expect(callCount).toBe(1)
  })

  it('DOES retry POST 500 because POST auto-generates an idempotency key', async () => {
    let callCount = 0
    server.use(
      http.post('https://brew.new/api/v1/contacts', () => {
        callCount++
        if (callCount < 2) {
          return new HttpResponse(null, { status: 500 })
        }
        return HttpResponse.json({ ok: true }, { status: 201 })
      })
    )

    const { client } = makeTestHttpClient({
      configOverrides: { maxRetries: 2 },
    })
    const result = await client.request<{ ok: boolean }>({
      method: 'POST',
      path: '/v1/contacts',
      body: { email: 'jane@example.com' },
    })

    expect(callCount).toBe(2)
    expect(result.data.ok).toBe(true)
  })

  it('stops retrying once maxRetries is exhausted and throws the last error', async () => {
    let callCount = 0
    server.use(
      http.get('https://brew.new/api/v1/contacts', () => {
        callCount++
        return new HttpResponse(null, { status: 503 })
      })
    )

    const { client } = makeTestHttpClient({
      configOverrides: { maxRetries: 2 },
    })

    await expect(
      client.request({ method: 'GET', path: '/v1/contacts' })
    ).rejects.toBeInstanceOf(BrewApiError)

    // 1 initial attempt + 2 retries = 3 total calls.
    expect(callCount).toBe(3)
  })

  it('honors Retry-After on 429 by passing (seconds * 1000) to sleep', async () => {
    let callCount = 0
    server.use(
      http.get('https://brew.new/api/v1/contacts', () => {
        callCount++
        if (callCount < 2) {
          return new HttpResponse(null, {
            status: 429,
            headers: { 'retry-after': '2' },
          })
        }
        return HttpResponse.json({ contacts: [] })
      })
    )

    const { client, sleepCalls } = makeTestHttpClient({
      configOverrides: { maxRetries: 2 },
    })

    await client.request({ method: 'GET', path: '/v1/contacts' })

    expect(callCount).toBe(2)
    expect(sleepCalls).toEqual([2000])
  })
})
