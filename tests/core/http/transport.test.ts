import { http, HttpResponse, delay } from 'msw'
import { describe, expect, it } from 'vitest'

import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('http.request — transport injection and abort', () => {
  describe('custom fetch injection', () => {
    it('uses the fetch passed in config instead of global fetch', async () => {
      let wasCalled = false
      const customFetch: typeof globalThis.fetch = (...args) => {
        wasCalled = true
        return globalThis.fetch(...args)
      }

      server.use(
        http.get('https://brew.new/api/v1/contacts', () => {
          return HttpResponse.json({ contacts: [] })
        })
      )

      const { client } = makeTestHttpClient({
        configOverrides: { fetch: customFetch },
      })
      await client.request({ method: 'GET', path: '/v1/contacts' })

      expect(wasCalled).toBe(true)
    })
  })

  describe('abort / signal handling', () => {
    it('propagates a caller-initiated abort by rejecting the request', async () => {
      server.use(
        http.get('https://brew.new/api/v1/contacts', async () => {
          await delay(500)
          return HttpResponse.json({ contacts: [] })
        })
      )

      const abortController = new AbortController()
      const { client } = makeTestHttpClient()

      const pending = client.request({
        method: 'GET',
        path: '/v1/contacts',
        options: { signal: abortController.signal },
      })

      abortController.abort()

      await expect(pending).rejects.toThrow()
    })
  })
})
