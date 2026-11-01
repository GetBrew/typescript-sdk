import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { BrewApiError, BrewConnectionError } from '../../../src/core/errors'
import { createAnalyticsResource } from '../../../src/resources/analytics/resource'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const IDENTITY_TOKEN_URL = 'https://brew.new/api/v1/analytics/identity-token'
const INPUT = {
  projectId: 'project-123',
  userId: 'user-123',
  contactId: '507f1f77bcf86cd799439011',
  anonymousId: 'anonymous-123',
}
const TOKEN = {
  token: 'signed-token',
  expiresAt: '2026-10-28T12:05:00.000Z',
}

function unavailable(): Response {
  return HttpResponse.json(
    {
      error: {
        code: 'SERVICE_UNAVAILABLE',
        type: 'service_unavailable',
        message: 'Try again.',
      },
    },
    { status: 503 }
  )
}

describe('analytics.createIdentityToken', () => {
  it('does not promise cached token replay through an idempotency header', async () => {
    const keys: Array<string | null> = []
    server.use(
      http.post(IDENTITY_TOKEN_URL, ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'))
        return HttpResponse.json(TOKEN)
      })
    )
    const { client } = makeTestHttpClient()
    const analytics = createAnalyticsResource(client)
    await analytics.createIdentityToken(INPUT)
    await analytics.createIdentityToken(INPUT, { idempotencyKey: 'caller-key' })
    expect(keys).toEqual([null, null])
  })

  it.each([
    {
      failure: 'a 503 response',
      answer: unavailable,
      errorType: BrewApiError,
    },
    {
      failure: 'a failed connection',
      answer: () => HttpResponse.error(),
      errorType: BrewConnectionError,
    },
  ])(
    'makes one attempt on $failure despite client-wide retries',
    async ({ answer, errorType }) => {
      let calls = 0
      server.use(
        http.post(IDENTITY_TOKEN_URL, () => {
          calls++
          return answer()
        })
      )
      const { client } = makeTestHttpClient({
        configOverrides: { maxRetries: 2 },
      })

      const error = await createAnalyticsResource(client)
        .createIdentityToken(INPUT)
        .catch((caught: unknown) => caught)

      expect(error).toBeInstanceOf(errorType)
      expect(calls).toBe(1)
    }
  )

  it('retries only when the caller opts in for the request', async () => {
    const keys: Array<string | null> = []
    server.use(
      http.post(IDENTITY_TOKEN_URL, ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'))
        return keys.length === 1 ? unavailable() : HttpResponse.json(TOKEN)
      })
    )
    const { client } = makeTestHttpClient({
      configOverrides: { maxRetries: 0 },
    })

    const result = await createAnalyticsResource(client).createIdentityToken(
      INPUT,
      { maxRetries: 1 }
    )

    expect(keys).toEqual([null, null])
    expect(result).toEqual(TOKEN)
  })

  it('binds a browser anonymous ID and external user to an existing contact', async () => {
    let body: unknown
    server.use(
      http.post(IDENTITY_TOKEN_URL, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(TOKEN)
      })
    )
    const { client } = makeTestHttpClient()
    const result =
      await createAnalyticsResource(client).createIdentityToken(INPUT)
    expect(body).toEqual(INPUT)
    expect(result).toEqual(TOKEN)
  })
})
