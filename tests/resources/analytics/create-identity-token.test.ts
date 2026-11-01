import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createAnalyticsResource } from '../../../src/resources/analytics/resource'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('analytics.createIdentityToken', () => {
  it('does not promise cached token replay through an idempotency header', async () => {
    const keys: Array<string | null> = []
    server.use(
      http.post(
        'https://brew.new/api/v1/analytics/identity-token',
        ({ request }) => {
          keys.push(request.headers.get('Idempotency-Key'))
          return HttpResponse.json({
            token: 'fresh-token',
            expiresAt: '2026-10-28T12:05:00.000Z',
          })
        }
      )
    )
    const input = {
      projectId: 'project-123',
      userId: 'user-123',
      contactId: '507f1f77bcf86cd799439011',
      anonymousId: 'anonymous-123',
    }
    const { client } = makeTestHttpClient()
    const analytics = createAnalyticsResource(client)
    await analytics.createIdentityToken(input)
    await analytics.createIdentityToken(input, { idempotencyKey: 'caller-key' })
    expect(keys).toEqual([null, null])
  })

  it('binds a browser anonymous ID and external user to an existing contact', async () => {
    let body: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/analytics/identity-token',
        async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({
            token: 'signed-token',
            expiresAt: '2026-10-28T12:05:00.000Z',
          })
        }
      )
    )
    const input = {
      projectId: 'project-123',
      userId: 'user-123',
      contactId: '507f1f77bcf86cd799439011',
      anonymousId: 'anonymous-123',
    }
    const { client } = makeTestHttpClient()
    const result =
      await createAnalyticsResource(client).createIdentityToken(input)
    expect(body).toEqual(input)
    expect(result).toEqual({
      token: 'signed-token',
      expiresAt: '2026-10-28T12:05:00.000Z',
    })
  })
})
