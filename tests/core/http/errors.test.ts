import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { BrewApiError } from '../../../src/core/errors'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('http.request — error mapping', () => {
  it('throws BrewApiError on 404 with the envelope mapped', async () => {
    server.use(
      http.get('https://brew.new/api/v1/contacts/missing', () => {
        return HttpResponse.json(
          {
            code: 'contact_not_found',
            type: 'not_found',
            message: 'Contact does not exist',
          },
          {
            status: 404,
            headers: { 'x-request-id': 'req_not_found' },
          }
        )
      })
    )

    const { client } = makeTestHttpClient()

    await expect(
      client.request({ method: 'GET', path: '/v1/contacts/missing' })
    ).rejects.toMatchObject({
      name: 'BrewApiError',
      status: 404,
      code: 'contact_not_found',
      type: 'not_found',
      message: 'Contact does not exist',
      requestId: 'req_not_found',
    })
  })

  it('throws BrewApiError on 500 with requestId preserved from headers', async () => {
    server.use(
      http.get('https://brew.new/api/v1/contacts', () => {
        return HttpResponse.json(
          {
            code: 'internal_error',
            type: 'server_error',
            message: 'boom',
          },
          {
            status: 500,
            headers: { 'x-request-id': 'req_boom' },
          }
        )
      })
    )

    // maxRetries: 0 so the test asserts on the very first response rather
    // than waiting for the retry loop to exhaust itself.
    const { client } = makeTestHttpClient({
      configOverrides: { maxRetries: 0 },
    })

    try {
      await client.request({ method: 'GET', path: '/v1/contacts' })
      expect.fail('expected BrewApiError to be thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(BrewApiError)
      const asError = error as BrewApiError
      expect(asError.status).toBe(500)
      expect(asError.requestId).toBe('req_boom')
    }
  })
})
