import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createAnalyticsTriggerInstancesResource } from '../../../../src/resources/analytics/trigger-instances/resource'
import { makeTestHttpClient } from '../../../helpers/http-client'
import { server } from '../../../msw/server'

const INSTANCE_ROW = {
  triggerInstanceId: 'tin_01',
  source: 'api' as const,
  triggerEventId: 'tri_x',
  state: 'processed',
  matchedAutomationIds: ['auto_abc'],
  automationRunIds: ['run_a'],
  attempts: 1,
  receivedAt: '2026-04-08T12:34:56.789Z',
  processedAt: '2026-04-08T12:34:57.000Z',
}

describe('analytics.triggerInstances resource — read-only list/get wiring', () => {
  it('list GETs /v1/analytics/trigger-instances with the triggerEventId filter and returns { data, pagination }', async () => {
    let url: string | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/analytics/trigger-instances',
        ({ request }) => {
          url = request.url
          return HttpResponse.json({
            data: [INSTANCE_ROW],
            pagination: { limit: 100, cursor: null, hasMore: false },
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const triggerInstances = createAnalyticsTriggerInstancesResource(client)
    const result = await triggerInstances.list({ triggerEventId: 'tri_x' })

    expect(new URL(url!).pathname).toBe('/api/v1/analytics/trigger-instances')
    expect(new URL(url!).searchParams.get('triggerEventId')).toBe('tri_x')
    expect(result.data[0]?.triggerInstanceId).toBe('tin_01')
    expect(result.data[0]?.automationRunIds).toEqual(['run_a'])
  })

  it('list with triggerInstanceId GETs /v1/analytics/trigger-instances?triggerInstanceId and returns the single-row page', async () => {
    let url: string | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/analytics/trigger-instances',
        ({ request }) => {
          url = request.url
          // Detail mode = single-row page `{ data: [row] }`, no pagination.
          return HttpResponse.json({ data: [INSTANCE_ROW] })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const triggerInstances = createAnalyticsTriggerInstancesResource(client)
    // Reads are flat: identity in the query (`?triggerInstanceId=`).
    const result = await triggerInstances.list({ triggerInstanceId: 'tin_01' })

    const parsed = new URL(url!)
    expect(parsed.pathname).toBe('/api/v1/analytics/trigger-instances')
    expect(parsed.searchParams.get('triggerInstanceId')).toBe('tin_01')
    expect(result.data[0]?.triggerInstanceId).toBe('tin_01')
    expect(result.data[0]?.source).toBe('api')
    expect(result.pagination).toBeUndefined()
  })
})
