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

  it('does not surface fire / test / replay / cancel methods (runs are read-only)', () => {
    const { client } = makeTestHttpClient()
    const runs = createAutomationRunsResource(client)
    expect('fire' in runs).toBe(false)
    expect('test' in runs).toBe(false)
    expect('replay' in runs).toBe(false)
    expect('cancel' in runs).toBe(false)
  })

  it('list with automationRunId + include logs returns the single-row page with logs[] inlined', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/automations/runs', ({ request }) => {
        url = request.url
        // Detail mode = single-row page; `include=logs` inlines per-node logs[].
        return HttpResponse.json({
          data: [
            {
              ...RUN_ROW,
              logs: [
                {
                  automationRunId: 'run_a',
                  nodeId: 'trg',
                  nodeName: 'On signup',
                  nodeType: 'trigger',
                  status: 'success',
                  orderIndex: 0,
                  startedAt: '2026-04-08T12:34:56.789Z',
                },
              ],
            },
          ],
        })
      })
    )
    const { client } = makeTestHttpClient()
    const runs = createAutomationRunsResource(client)
    // Reads are flat: identity in the query, `include` for the opt-in logs.
    const result = await runs.list({
      automationRunId: 'run_a',
      include: 'logs',
    })

    const params = new URL(url!).searchParams
    expect(new URL(url!).pathname).toBe('/api/v1/automations/runs')
    expect(params.get('automationRunId')).toBe('run_a')
    expect(params.get('include')).toBe('logs')
    expect(result.data[0]?.automationRunId).toBe('run_a')
    expect(result.data[0]?.logs).toHaveLength(1)
    expect(result.data[0]?.logs?.[0]?.nodeType).toBe('trigger')
    expect(result.pagination).toBeUndefined()
  })
})
