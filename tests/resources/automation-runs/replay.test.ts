import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createAutomationRunsResource } from '../../../src/resources/automation-runs/resource'
import { BrewApiError } from '../../../src/core/errors'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('automationRuns.replay', () => {
  it('POSTs { automationRunId, mode:replay } and returns replay_started', async () => {
    let body: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/automation/runs',
        async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(
            {
              automationRunIds: ['run_new'],
              status: 'replay_started',
              receivedAt: '2026-04-08T12:34:56.789Z',
            },
            { status: 202 }
          )
        }
      )
    )

    const { client } = makeTestHttpClient()
    const runs = createAutomationRunsResource(client)

    const result = await runs.replay({ automationRunId: 'run_old' })

    expect(body).toEqual({ automationRunId: 'run_old', mode: 'replay' })
    expect(result.status).toBe('replay_started')
    expect(result.automationRunIds).toEqual(['run_new'])
  })

  it('maps a 404 AUTOMATION_RUN_NOT_FOUND into a BrewApiError', async () => {
    server.use(
      http.post('https://brew.new/api/v1/automation/runs', () =>
        HttpResponse.json(
          {
            error: {
              code: 'AUTOMATION_RUN_NOT_FOUND',
              type: 'not_found',
              message: 'No run found.',
              suggestion: 'List runs with GET /v1/automation/runs.',
              docs: 'https://docs.brew.new/api-reference/api/errors',
            },
          },
          { status: 404 }
        )
      )
    )

    const { client } = makeTestHttpClient()
    const runs = createAutomationRunsResource(client)

    await expect(
      runs.replay({ automationRunId: 'nope' })
    ).rejects.toBeInstanceOf(BrewApiError)
    await expect(
      runs.replay({ automationRunId: 'nope' })
    ).rejects.toMatchObject({ status: 404, code: 'AUTOMATION_RUN_NOT_FOUND' })
  })
})
