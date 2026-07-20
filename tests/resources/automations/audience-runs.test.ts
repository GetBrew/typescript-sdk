import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createAutomationsResource } from '../../../src/resources/automations/resource'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('manual-audience automation runs', () => {
  it('launches a run with path identity, typed body, and idempotency', async () => {
    let captured: Request | undefined
    let body: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/automations/auto_1/run',
        async ({ request }) => {
          captured = request.clone()
          body = await request.json()
          return HttpResponse.json(
            {
              audienceRunId: 'arun_1',
              automationId: 'auto_1',
              status: 'scheduled',
              totalRecipients: 100,
              receivedAt: '2026-07-20T12:00:00.000Z',
            },
            { status: 202 }
          )
        }
      )
    )

    const { client } = makeTestHttpClient()
    const automations = createAutomationsResource(client)
    const result = await automations.run(
      {
        automationId: 'auto_1',
        scheduledAt: '2026-07-21T12:00:00.000Z',
      },
      { idempotencyKey: 'run-1' }
    )

    expect(body).toEqual({ scheduledAt: '2026-07-21T12:00:00.000Z' })
    expect(captured?.headers.get('Idempotency-Key')).toBe('run-1')
    expect('audienceRunId' in result && result.audienceRunId).toBe('arun_1')
  })

  it('lists and controls audience runs through the nested resource', async () => {
    let listRequest: Request | undefined
    let controlBody: unknown
    server.use(
      http.get(
        'https://brew.new/api/v1/automations/audience-runs',
        ({ request }) => {
          listRequest = request.clone()
          return HttpResponse.json({
            data: [
              {
                audienceRunId: 'arun_1',
                automationId: 'auto_1',
                audienceId: 'aud_1',
                status: 'running',
                createdAt: '2026-07-20T12:00:00.000Z',
                updatedAt: '2026-07-20T12:00:00.000Z',
              },
            ],
          })
        }
      ),
      http.post(
        'https://brew.new/api/v1/automations/audience-runs/arun_1/control',
        async ({ request }) => {
          controlBody = await request.json()
          return HttpResponse.json({
            audienceRunId: 'arun_1',
            status: 'paused',
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const automations = createAutomationsResource(client)
    const listed = await automations.audienceRuns.list({
      automationId: 'auto_1',
      limit: 25,
    })
    const controlled = await automations.audienceRuns.control({
      audienceRunId: 'arun_1',
      action: 'pause',
    })

    const url = new URL(listRequest!.url)
    expect(url.searchParams.get('automationId')).toBe('auto_1')
    expect(url.searchParams.get('limit')).toBe('25')
    expect(listed.data[0]?.audienceRunId).toBe('arun_1')
    expect(controlBody).toEqual({ action: 'pause' })
    expect(controlled.status).toBe('paused')
  })
})
