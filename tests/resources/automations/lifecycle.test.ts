import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { CreateAutomationInput, PatchAutomationInput } from '../../../src'
import { createAutomationsResource } from '../../../src/resources/automations/resource'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const GOAL = {
  schemaVersion: 1 as const,
  kind: 'event' as const,
  event: { sourceId: 'source_project', providerEventKey: 'paid' },
  windowDays: 14,
  stopRemainingSends: true,
}

describe('automation goal authoring', () => {
  it('accepts typed goal creation and preserves its source event and window', async () => {
    let body: unknown
    server.use(
      http.post('https://brew.new/api/v1/automations', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(
          { automationId: 'auto_goal', goal: GOAL },
          { status: 201 }
        )
      })
    )
    const input: CreateAutomationInput = {
      name: 'Activation',
      triggerEventId: 'trigger_signup',
      nodes: [],
      connections: [],
      goal: GOAL,
    }
    const { client } = makeTestHttpClient()
    const result = await createAutomationsResource(client).create(input)
    expect(body).toEqual(input)
    expect(result.goal).toEqual(GOAL)
  })

  it.each([GOAL, null])(
    'forwards an explicit goal update or clear without the path identity in its body',
    async (goal) => {
      let body: unknown
      server.use(
        http.patch(
          'https://brew.new/api/v1/automations/auto_goal',
          async ({ request }) => {
            body = await request.json()
            return HttpResponse.json({ automationId: 'auto_goal' })
          }
        )
      )
      const input: PatchAutomationInput = { automationId: 'auto_goal', goal }
      const { client } = makeTestHttpClient()
      await createAutomationsResource(client).patch(input)
      expect(body).toEqual({ goal })
    }
  )
})
