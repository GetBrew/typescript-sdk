import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createAutomationRunsResource } from '../../../src/resources/automation-runs/resource'
import { createEventsResource } from '../../../src/resources/events/resource'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('automation runs resource — fire/test/replay + list/get/cancel', () => {
  it('fire sugar POSTs to /v1/automation/runs with the fire body', async () => {
    let body: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/automation/runs',
        async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({
            triggerInstanceId: 'tin_01HZ',
            automationRunIds: ['run_a'],
            status: 'triggered',
            counts: { automations: 1, transactionalEmails: 0 },
            receivedAt: '2026-04-08T12:34:56.789Z',
          })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const runs = createAutomationRunsResource(client)
    const result = await runs.fire({
      triggerEventId: 'tri_x',
      payload: { email: 'jane@example.com' },
    })
    expect(body).toEqual({
      triggerEventId: 'tri_x',
      payload: { email: 'jane@example.com' },
    })
    expect(result.automationRunIds).toEqual(['run_a'])
    expect(result.status).toBe('triggered')
  })

  it('test sugar POSTs with mode:test (no metadata field accepted)', async () => {
    let body: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/automation/runs',
        async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(
            {
              automationRunIds: ['run_test'],
              status: 'test_started',
              receivedAt: '2026-04-08T12:34:56.789Z',
            },
            { status: 202 }
          )
        }
      )
    )
    const { client } = makeTestHttpClient()
    const runs = createAutomationRunsResource(client)
    const result = await runs.test({
      automationId: 'auto_abc',
      payload: { email: 'qa@example.com' },
    })
    expect(body).toEqual({
      automationId: 'auto_abc',
      payload: { email: 'qa@example.com' },
      mode: 'test',
    })
    expect(result.status).toBe('test_started')
  })

  it('list GETs with filters serialised into the query string', async () => {
    server.use(
      http.get('https://brew.new/api/v1/automation/runs', ({ request }) => {
        const params = new URL(request.url).searchParams
        expect(params.get('automationId')).toBe('auto_abc')
        expect(params.get('status')).toBe('completed')
        expect(params.get('limit')).toBe('25')
        return HttpResponse.json({
          runs: [],
          pagination: { limit: 25, hasMore: false },
        })
      })
    )
    const { client } = makeTestHttpClient()
    const runs = createAutomationRunsResource(client)
    await runs.list({
      automationId: 'auto_abc',
      status: 'completed',
      limit: 25,
    })
  })

  it('get with include=logs threads the query and returns a one-element { runs }', async () => {
    server.use(
      http.get('https://brew.new/api/v1/automation/runs', ({ request }) => {
        const params = new URL(request.url).searchParams
        expect(params.get('automationRunId')).toBe('run_a')
        expect(params.get('include')).toBe('logs')
        return HttpResponse.json({
          runs: [
            {
              automationRunId: 'run_a',
              automationId: 'auto_abc',
              automationVersionId: 'av_v1',
              mode: 'live',
              status: 'completed',
            },
          ],
          logs: [],
        })
      })
    )
    const { client } = makeTestHttpClient()
    const runs = createAutomationRunsResource(client)
    const result = await runs.get({
      automationRunId: 'run_a',
      include: ['logs'],
    })
    expect(result.runs).toHaveLength(1)
    expect(result.runs[0]?.automationRunId).toBe('run_a')
    expect(Array.isArray(result.logs)).toBe(true)
  })

  it('cancel PATCHes with status:cancelled', async () => {
    let body: unknown
    server.use(
      http.patch(
        'https://brew.new/api/v1/automation/runs',
        async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({
            runs: [
              {
                automationRunId: 'run_a',
                automationId: 'auto_abc',
                automationVersionId: 'av_v1',
                mode: 'live',
                status: 'cancelled',
              },
            ],
          })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const runs = createAutomationRunsResource(client)
    await runs.cancel({
      automationRunId: 'run_a',
      reason: 'recipient unsubscribed',
    })
    expect(body).toEqual({
      automationRunId: 'run_a',
      reason: 'recipient unsubscribed',
      status: 'cancelled',
    })
  })

  it('events back-compat alias targets /v1/automation/runs under the hood', async () => {
    let url: string | undefined
    server.use(
      http.post(
        'https://brew.new/api/v1/automation/runs',
        ({ request }) => {
          url = request.url
          return HttpResponse.json({
            triggerInstanceId: 'tin_01',
            automationRunIds: ['run_a'],
            status: 'triggered',
            receivedAt: '2026-04-08T12:34:56.789Z',
          })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const events = createEventsResource(client)
    await events.fire({
      triggerEventId: 'tri_x',
      payload: { email: 'jane@example.com' },
    })
    expect(url).toContain('/v1/automation/runs')
  })
})
