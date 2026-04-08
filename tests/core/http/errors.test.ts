import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { BrewApiError } from '../../../src/core/errors'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('http.request — error mapping', () => {
  it('throws BrewApiError on 404 with the wrapped envelope mapped', async () => {
    server.use(
      http.get('https://brew.new/api/v1/contacts/missing', () => {
        return HttpResponse.json(
          {
            error: {
              code: 'CONTACT_NOT_FOUND',
              type: 'not_found',
              message: 'Contact does not exist',
              suggestion: 'Use POST /api/v1/contacts to create one first.',
              docs: 'https://docs.getbrew.io/api/contacts#errors',
              param: 'email',
            },
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
      code: 'CONTACT_NOT_FOUND',
      type: 'not_found',
      message: 'Contact does not exist',
      requestId: 'req_not_found',
      param: 'email',
    })
  })

  it('throws BrewApiError on 500 with requestId preserved from headers', async () => {
    server.use(
      http.get('https://brew.new/api/v1/contacts', () => {
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
