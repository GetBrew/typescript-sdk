import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createAutomationRunsResource } from '../../../../src/resources/automations/runs/resource'
import { makeTestHttpClient } from '../../../helpers/http-client'
import { server } from '../../../msw/server'

const RUN_ROW = {
  automationRunId: 'run_a',
  automationId: 'auto_abc',
  automationVersionId: 'av_v1',
  mode: 'live' as const,
  status: 'completed' as const,
}

describe('automations.runs resource — read-only list/get wiring', () => {
  it('list GETs /v1/automations/runs with filters serialised into the query string', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/automations/runs', ({ request }) => {
        url = request.url
        return HttpResponse.json({
          data: [RUN_ROW],
          pagination: { limit: 25, cursor: null, hasMore: false },
        })
      })
    )
    const { client } = makeTestHttpClient()
    const runs = createAutomationRunsResource(client)
    const result = await runs.list({
      automationId: 'auto_abc',
      status: 'completed',
      limit: 25,
    })

    const params = new URL(url!).searchParams
    expect(params.get('automationId')).toBe('auto_abc')
    expect(params.get('status')).toBe('completed')
    expect(params.get('limit')).toBe('25')
    expect(result.data[0]?.automationRunId).toBe('run_a')
  })

  it('surfaces only list + get + cancel (no fire / test / replay — those live on triggers and automations)', () => {
    const { client } = makeTestHttpClient()
    const runs = createAutomationRunsResource(client)
    expect(Object.keys(runs).sort()).toEqual(['cancel', 'get', 'list'])
    expect('fire' in runs).toBe(false)
    expect('test' in runs).toBe(false)
    expect('replay' in runs).toBe(false)
  })

  it('get GETs /v1/automations/runs/{automationRunId} with include=logs and returns the BARE row', async () => {
    let url: string | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/automations/runs/run_a',
        ({ request }) => {
          url = request.url
          return HttpResponse.json({
            ...RUN_ROW,
            logs: [
              {
                automationRunId: 'run_a',
                nodeId: 'trg',
                nodeName: 'On signup',
                nodeType: 'trigger',
                status: 'completed',
                orderIndex: 0,
                startedAt: '2026-04-08T12:34:56.789Z',
              },
            ],
          })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const runs = createAutomationRunsResource(client)
    const run = await runs.get('run_a', { include: 'logs' })

    const parsed = new URL(url!)
    expect(parsed.pathname).toBe('/api/v1/automations/runs/run_a')
    expect(parsed.searchParams.get('include')).toBe('logs')
    expect(run.automationRunId).toBe('run_a')
    expect(run.logs).toHaveLength(1)
    expect(run.logs?.[0]?.nodeType).toBe('trigger')
    // A node reports running | completed | failed | skipped.
    expect(run.logs?.[0]?.status).toBe('completed')
  })

  it('rejects an automationRunId filter on the list read', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/automations/runs', ({ request }) => {
        url = request.url
        return HttpResponse.json({
          data: [RUN_ROW],
          pagination: { limit: 25, cursor: null, hasMore: false },
        })
      })
    )
    const { client } = makeTestHttpClient()
    await createAutomationRunsResource(client).list({
      automationId: 'auto_abc',
    })

    expect(new URL(url!).searchParams.get('automationRunId')).toBeNull()
  })
})
