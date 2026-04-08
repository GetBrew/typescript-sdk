import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('http.request — basics (URL, method, headers, body, success)', () => {
  let capturedRequest: Request | undefined

  beforeEach(() => {
    capturedRequest = undefined
  })

  describe('URL and method composition', () => {
    it('sends the right URL with query params', async () => {
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
        query: { limit: 25, email: 'jane@example.com' },
      })

      expect(capturedRequest).toBeDefined()
      const url = new URL(capturedRequest!.url)
      expect(url.origin + url.pathname).toBe('https://brew.new/api/v1/contacts')
      expect(url.searchParams.get('limit')).toBe('25')
      expect(url.searchParams.get('email')).toBe('jane@example.com')
    })

    it('sends the correct HTTP method', async () => {
      server.use(
        http.delete('https://brew.new/api/v1/contacts', ({ request }) => {
          capturedRequest = request
          return HttpResponse.json({ deleted: 1 })
        })
      )

      const { client } = makeTestHttpClient()
      await client.request({ method: 'DELETE', path: '/v1/contacts' })

      expect(capturedRequest?.method).toBe('DELETE')
    })
  })

  describe('headers', () => {
    it('sends Authorization: Bearer <apiKey>, Accept, and User-Agent', async () => {
      server.use(
        http.get('https://brew.new/api/v1/contacts', ({ request }) => {
          capturedRequest = request
          return HttpResponse.json({ contacts: [] })
        })
      )

      const { client } = makeTestHttpClient()
      await client.request({ method: 'GET', path: '/v1/contacts' })

      expect(capturedRequest?.headers.get('authorization')).toBe(
        'Bearer brew_test_abc'
      )
      expect(capturedRequest?.headers.get('accept')).toBe('application/json')
      expect(capturedRequest?.headers.get('user-agent')).toMatch(
        /^brew-typescript-sdk\//
      )
    })

    it('does NOT send Content-Type on a GET request without a body', async () => {
      server.use(
        http.get('https://brew.new/api/v1/contacts', ({ request }) => {
          capturedRequest = request
          return HttpResponse.json({ contacts: [] })
        })
      )

      const { client } = makeTestHttpClient()
      await client.request({ method: 'GET', path: '/v1/contacts' })

      expect(capturedRequest?.headers.get('content-type')).toBeNull()
    })
  })

  describe('body serialization', () => {
    it('serializes POST body as JSON and sets Content-Type', async () => {
      server.use(
        http.post('https://brew.new/api/v1/contacts', async ({ request }) => {
          capturedRequest = request.clone()
          const body = (await request.json()) as unknown
          return HttpResponse.json({ echoed: body }, { status: 201 })
        })
      )

      const { client } = makeTestHttpClient()
      const result = await client.request<{ echoed: unknown }>({
        method: 'POST',
        path: '/v1/contacts',
        body: { email: 'jane@example.com', firstName: 'Jane' },
      })

      expect(capturedRequest?.headers.get('content-type')).toBe(
        'application/json'
      )
      expect(result.data.echoed).toEqual({
        email: 'jane@example.com',
        firstName: 'Jane',
      })
    })
  })

  describe('success path', () => {
    it('returns data + status + headers + requestId on 2xx', async () => {
      server.use(
        http.get('https://brew.new/api/v1/contacts/abc', () => {
          return HttpResponse.json(
            { email: 'jane@example.com' },
            {
              status: 200,
              headers: { 'x-request-id': 'req_success_1' },
            }
          )
        })
      )

      const { client } = makeTestHttpClient()
      const result = await client.request<{ email: string }>({
        method: 'GET',
        path: '/v1/contacts/abc',
      })

      expect(result.data).toEqual({ email: 'jane@example.com' })
      expect(result.status).toBe(200)
      expect(result.requestId).toBe('req_success_1')
      expect(result.headers.get('x-request-id')).toBe('req_success_1')
    })
  })
})
