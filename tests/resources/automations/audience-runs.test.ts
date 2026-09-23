import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createAutomationsResource } from '../../../src/resources/automations/resource'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const AUDIENCE_RUN_ROW = {
  audienceRunId: 'arun_1',
  automationId: 'auto_1',
  audienceId: 'aud_1',
  status: 'running' as const,
  createdAt: '2026-07-20T12:00:00.000Z',
  updatedAt: '2026-07-20T12:00:00.000Z',
}

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

  it('previews with dryRun, the camelCase spelling that replaced dry_run', async () => {
    let body: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/automations/auto_1/run',
        async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({
            dryRun: true,
            automationId: 'auto_1',
            recipientCount: 100,
            sendNodeCount: 2,
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const automations = createAutomationsResource(client)
    await automations.run({ automationId: 'auto_1', dryRun: true })

    expect(body).toEqual({ dryRun: true })
  })

  it('lists audience runs without an id filter', async () => {
    let listRequest: Request | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/automations/audience-runs',
        ({ request }) => {
          listRequest = request.clone()
          return HttpResponse.json({
            data: [AUDIENCE_RUN_ROW],
            pagination: { limit: 25, cursor: null, hasMore: false },
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const automations = createAutomationsResource(client)
    const listed = await automations.audienceRuns.list({
      automationId: 'auto_1',
      status: 'running',
      limit: 25,
    })

    const url = new URL(listRequest!.url)
    expect(url.searchParams.get('automationId')).toBe('auto_1')
    expect(url.searchParams.get('status')).toBe('running')
    expect(url.searchParams.get('limit')).toBe('25')
    expect(url.searchParams.get('audienceRunId')).toBeNull()
    expect(listed.data[0]?.audienceRunId).toBe('arun_1')
  })

  it('reads one audience run as the bare row', async () => {
    let url: string | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/automations/audience-runs/arun_1',
        ({ request }) => {
          url = request.url
          return HttpResponse.json(AUDIENCE_RUN_ROW)
        }
      )
    )

    const { client } = makeTestHttpClient()
    const automations = createAutomationsResource(client)
    const run = await automations.audienceRuns.get('arun_1')

    expect(new URL(url!).pathname).toBe(
      '/api/v1/automations/audience-runs/arun_1'
    )
    expect(run.audienceRunId).toBe('arun_1')
    expect(run.status).toBe('running')
  })

  it.each([
    ['pause', 'paused'],
    ['resume', 'running'],
    ['cancel', 'canceled'],
  ] as const)(
    '%s POSTs its own action sub-path with no body verb',
    async (action, status) => {
      let captured: Request | undefined
      let rawBody: string | undefined
      server.use(
        http.post(
          `https://brew.new/api/v1/automations/audience-runs/arun_1/${action}`,
          async ({ request }) => {
            captured = request.clone()
            rawBody = await request.text()
            return HttpResponse.json({ audienceRunId: 'arun_1', status })
          }
        )
      )

      const { client } = makeTestHttpClient()
      const automations = createAutomationsResource(client)
      const result = await automations.audienceRuns[action]('arun_1')

      expect(new URL(captured!.url).pathname).toBe(
        `/api/v1/automations/audience-runs/arun_1/${action}`
      )
      // The `{ action }` body verb is gone — the path IS the verb.
      expect(rawBody).toBe('')
      expect(result.status).toBe(status)
    }
  )

  it('surfaces 409 RUN_NOT_PAUSABLE from pause as a BrewApiError', async () => {
    server.use(
      http.post(
        'https://brew.new/api/v1/automations/audience-runs/arun_1/pause',
        () =>
          HttpResponse.json(
            {
              error: {
                code: 'RUN_NOT_PAUSABLE',
                type: 'conflict',
                message: 'Audience run arun_1 is not pausable.',
                suggestion: 'Only a running audience run can be paused.',
                docs: 'https://docs.brew.new/api-reference/api/errors',
              },
            },
            { status: 409 }
          )
      )
    )

    const { client } = makeTestHttpClient()
    const automations = createAutomationsResource(client)

    await expect(
      automations.audienceRuns.pause('arun_1')
    ).rejects.toMatchObject({ status: 409, code: 'RUN_NOT_PAUSABLE' })
  })
})
