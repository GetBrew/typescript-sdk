import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createGetAudience } from '../../../src/resources/audiences/get'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const AUDIENCE = {
  audienceId: 'aud_123',
  audienceName: 'Beta',
  filters: { filters: [], logicalOperator: 'and' },
  count: 42,
  createdAt: '2026-04-08T12:00:00.000Z',
  updatedAt: '2026-04-08T12:00:00.000Z',
}

describe('audiences.get', () => {
  it('GETs /v1/audiences/{audienceId} and returns the BARE row', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/audiences/aud_123', ({ request }) => {
        url = request.url
        return HttpResponse.json(AUDIENCE)
      })
    )

    const { client } = makeTestHttpClient()
    const audience = await createGetAudience(client)('aud_123')

    expect(new URL(url!).pathname).toBe('/api/v1/audiences/aud_123')
    expect(new URL(url!).search).toBe('')
    expect(audience.audienceId).toBe('aud_123')
    expect(audience.count).toBe(42)
  })

  it('serializes include: "count" for the live member total', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/audiences/aud_123', ({ request }) => {
        url = request.url
        return HttpResponse.json({ ...AUDIENCE, count: 51 })
      })
    )

    const { client } = makeTestHttpClient()
    const audience = await createGetAudience(client)('aud_123', {
      include: 'count',
    })

    expect(new URL(url!).searchParams.get('include')).toBe('count')
    expect(audience.count).toBe(51)
  })

  it('serializes include: ["count", "build"] as one comma list', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/audiences/aud_123', ({ request }) => {
        url = request.url
        return HttpResponse.json({ ...AUDIENCE, count: 51 })
      })
    )

    const { client } = makeTestHttpClient()
    await createGetAudience(client)('aud_123', { include: ['count', 'build'] })

    expect(new URL(url!).searchParams.get('include')).toBe('count,build')
  })

  it('surfaces an unknown id as 404 AUDIENCE_NOT_FOUND, not an empty page', async () => {
    server.use(
      http.get('https://brew.new/api/v1/audiences/aud_missing', () =>
        HttpResponse.json(
          {
            error: {
              code: 'AUDIENCE_NOT_FOUND',
              type: 'not_found',
              message: 'Audience aud_missing was not found.',
              suggestion: 'List audiences with GET /v1/audiences.',
              docs: 'https://docs.brew.new/api-reference/api/errors',
            },
          },
          { status: 404 }
        )
      )
    )

    const { client } = makeTestHttpClient()

    await expect(
      createGetAudience(client)('aud_missing')
    ).rejects.toMatchObject({ status: 404, code: 'AUDIENCE_NOT_FOUND' })
  })
})
