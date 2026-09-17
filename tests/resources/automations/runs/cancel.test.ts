import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createCancelAutomationRun } from '../../../../src/resources/automations/runs/cancel'
import { makeTestHttpClient } from '../../../helpers/http-client'
import { server } from '../../../msw/server'

describe('automations.runs.cancel', () => {
  it('sends PATCH /v1/automations/runs with the run id, status: canceled, and the note', async () => {
    let capturedRequest: Request | undefined
    let capturedBody: unknown
    server.use(
      http.patch(
        'https://brew.new/api/v1/automations/runs',
        async ({ request }) => {
          capturedRequest = request
          capturedBody = await request.json()
          return HttpResponse.json({
            automationRunId: 'run_1',
            status: 'canceled',
            previousStatus: 'running',
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const cancel = createCancelAutomationRun(client)

    const result = await cancel({
      automationRunId: 'run_1',
      reason: 'wrong audience',
    })

    expect(capturedRequest?.method).toBe('PATCH')
    expect(new URL(capturedRequest!.url).pathname).toBe(
      '/api/v1/automations/runs'
    )
    expect(capturedBody).toEqual({
      automationRunId: 'run_1',
      status: 'canceled',
      reason: 'wrong audience',
    })
    expect(result).toEqual({
      automationRunId: 'run_1',
      status: 'canceled',
      previousStatus: 'running',
    })
  })

  it('maps 409 RUN_NOT_CANCELLABLE to a BrewApiError without retrying', async () => {
    let calls = 0
    server.use(
      http.patch('https://brew.new/api/v1/automations/runs', () => {
        calls += 1
        return HttpResponse.json(
          {
            error: {
              code: 'RUN_NOT_CANCELLABLE',
              type: 'conflict',
              message: 'Run run_1 already completed.',
              suggestion:
                'Only pending or running runs can be canceled; read the run with GET /v1/automations/runs?automationRunId=.',
              docs: 'https://docs.brew.new/api-reference/api/errors',
            },
          },
          { status: 409 }
        )
      })
    )

    const { client } = makeTestHttpClient()
    const cancel = createCancelAutomationRun(client)

    await expect(cancel({ automationRunId: 'run_1' })).rejects.toMatchObject({
      status: 409,
      code: 'RUN_NOT_CANCELLABLE',
    })
    expect(calls).toBe(1)
  })
})
