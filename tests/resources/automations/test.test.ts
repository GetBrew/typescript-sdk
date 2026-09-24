import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createTestAutomation } from '../../../src/resources/automations/test'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('automations.test', () => {
  it('forwards a scenario (simulated engagement + forced splits) in the body', async () => {
    let body: unknown
    let path: string | undefined
    server.use(
      http.post(
        'https://brew.new/api/v1/automations/auto_1/test',
        async ({ request }) => {
          body = await request.json()
          path = new URL(request.url).pathname
          return HttpResponse.json(
            {
              automationRunIds: ['run_1'],
              status: 'test_started',
              testMode: 'scenario',
              receivedAt: '2026-09-24T10:00:00.000Z',
            },
            { status: 202 }
          )
        }
      )
    )

    const scenario = {
      engagement: [
        {
          nodeId: 'email_first',
          events: [{ type: 'opened' as const, afterMs: 60_000 }],
        },
      ],
    }
    const { client } = makeTestHttpClient()
    const result = await createTestAutomation(client)({
      automationId: 'auto_1',
      testRecipient: 'qa@brewmail.dev',
      scenario,
    })

    expect(path).toBe('/api/v1/automations/auto_1/test')
    expect(body).toEqual({ testRecipient: 'qa@brewmail.dev', scenario })
    expect(result.testMode).toBe('scenario')
  })
})
