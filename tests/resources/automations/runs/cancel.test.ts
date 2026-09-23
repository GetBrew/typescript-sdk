import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createCancelAutomationRun } from '../../../../src/resources/automations/runs/cancel'
import { makeTestHttpClient } from '../../../helpers/http-client'
import { server } from '../../../msw/server'

describe('automations.runs.cancel', () => {
  it('POSTs /v1/automations/runs/{automationRunId}/cancel with the note in the body', async () => {
    let capturedRequest: Request | undefined
    let capturedBody: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/automations/runs/run_1/cancel',
        async ({ request }) => {
          capturedRequest = request.clone()
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

    const result = await cancel('run_1', { reason: 'wrong audience' })

    expect(capturedRequest?.method).toBe('POST')
    expect(new URL(capturedRequest!.url).pathname).toBe(
      '/api/v1/automations/runs/run_1/cancel'
    )
    // The id rides the URL now; it is no longer a body field.
    expect(capturedBody).toEqual({ reason: 'wrong audience' })
    expect(result).toEqual({
      automationRunId: 'run_1',
      status: 'canceled',
      previousStatus: 'running',
    })
  })

  it('sends no body at all when no reason is given', async () => {
    let rawBody: string | undefined
    server.use(
      http.post(
        'https://brew.new/api/v1/automations/runs/run_1/cancel',
        async ({ request }) => {
          rawBody = await request.text()
          return HttpResponse.json({
            automationRunId: 'run_1',
            status: 'canceled',
            previousStatus: 'queued',
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    await createCancelAutomationRun(client)('run_1')

    expect(rawBody).toBe('')
  })

  it('maps 409 RUN_NOT_CANCELLABLE to a BrewApiError without retrying', async () => {
    let calls = 0
    server.use(
      http.post('https://brew.new/api/v1/automations/runs/run_1/cancel', () => {
        calls += 1
        return HttpResponse.json(
          {
            error: {
              code: 'RUN_NOT_CANCELLABLE',
              type: 'conflict',
              message: 'Run run_1 already completed.',
              suggestion:
                'Only queued or running runs can be canceled; read the run with GET /v1/automations/runs/{automationRunId}.',
              docs: 'https://docs.brew.new/api-reference/api/errors',
            },
          },
          { status: 409 }
        )
      })
    )

    const { client } = makeTestHttpClient()
    const cancel = createCancelAutomationRun(client)

    await expect(cancel('run_1')).rejects.toMatchObject({
      status: 409,
      code: 'RUN_NOT_CANCELLABLE',
    })
    expect(calls).toBe(1)
  })
})
