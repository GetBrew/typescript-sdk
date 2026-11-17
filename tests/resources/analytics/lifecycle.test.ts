import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { createAnalyticsResource } from '../../../src/resources/analytics/resource'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('observed automation outcomes', () => {
  it('forwards pinned version and opaque evidence cursor alongside delivery window filters', async () => {
    let query: URLSearchParams | undefined
    const outcomes = { continueCursor: 'next_evidence', evidence: [] }
    server.use(
      http.get(
        'https://brew.new/api/v1/analytics/automations',
        ({ request }) => {
          query = new URL(request.url).searchParams
          return HttpResponse.json({ data: [], outcomes, truncated: false })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const result = await createAnalyticsResource(client).automations({
      automationId: 'auto_goal',
      outcomesVersionId: 'version/one',
      outcomesCursor: 'cursor+/=opaque',
      from: '2026-11-01T00:00:00Z',
      to: '2026-11-17T00:00:00Z',
      limit: 1,
    })
    expect(Object.fromEntries(query!)).toEqual({
      automationId: 'auto_goal',
      outcomesVersionId: 'version/one',
      outcomesCursor: 'cursor+/=opaque',
      from: '2026-11-01T00:00:00Z',
      to: '2026-11-17T00:00:00Z',
      limit: '1',
    })
    expect(result.outcomes?.continueCursor).toBe('next_evidence')
  })
})
