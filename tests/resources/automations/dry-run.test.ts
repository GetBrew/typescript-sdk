import { http, HttpResponse } from 'msw'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { createAutomationsResource } from '../../../src/resources/automations/resource'
import type {
  Automation,
  AutomationDryRunReport,
} from '../../../src/resources/automations/types'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const TRIGGER_NODE = {
  id: 'trg',
  label: 'On signup',
  type: 'trigger' as const,
  config: { actionType: 'trigger' },
}

const REPORT = {
  valid: false,
  blockers: [
    {
      nodeId: 'send',
      nodeLabel: 'Welcome email',
      severity: 'error' as const,
      message: 'The send step has no subject.',
    },
  ],
  warnings: [],
  blockingIssues: [],
  nodeCounts: { sendEmail: 1, wait: 0, filter: 0, split: 0 },
}

describe('automation dry runs', () => {
  it('create with dryRun: true sends it and returns the dry-run report', async () => {
    let sent: unknown
    server.use(
      http.post('https://brew.new/api/v1/automations', async ({ request }) => {
        sent = await request.json()
        // A dry run answers 200 with the report; nothing is created.
        return HttpResponse.json(REPORT, { status: 200 })
      })
    )
    const { client } = makeTestHttpClient()
    const automations = createAutomationsResource(client)

    const report = await automations.create({
      name: 'Welcome',
      triggerEventId: 'tri_signup',
      nodes: [TRIGGER_NODE],
      connections: [],
      dryRun: true,
    })

    expect(sent).toMatchObject({ name: 'Welcome', dryRun: true })
    expect(report.valid).toBe(false)
    expect(report.blockers[0]?.message).toBe('The send step has no subject.')
    expectTypeOf(report).toEqualTypeOf<AutomationDryRunReport>()
  })

  it('patch with dryRun: true returns the dry-run report', async () => {
    let sent: unknown
    server.use(
      http.patch(
        'https://brew.new/api/v1/automations/auto_abc',
        async ({ request }) => {
          sent = await request.json()
          return HttpResponse.json(REPORT)
        }
      )
    )
    const { client } = makeTestHttpClient()
    const automations = createAutomationsResource(client)

    const report = await automations.patch({
      automationId: 'auto_abc',
      name: 'Welcome v2',
      dryRun: true,
    })

    expect(sent).toEqual({ name: 'Welcome v2', dryRun: true })
    expect(report.nodeCounts.sendEmail).toBe(1)
    expectTypeOf(report).toEqualTypeOf<AutomationDryRunReport>()
  })

  it('types a plain create and patch as the automation row', () => {
    const { client } = makeTestHttpClient()
    const automations = createAutomationsResource(client)
    // Type-level only: the calls are never made.
    const create = () =>
      automations.create({
        name: 'Welcome',
        triggerEventId: 'tri_signup',
        nodes: [TRIGGER_NODE],
        connections: [],
      })
    const patch = () =>
      automations.patch({ automationId: 'auto_abc', name: 'Welcome v2' })
    expectTypeOf(create).returns.resolves.toEqualTypeOf<Automation>()
    expectTypeOf(patch).returns.resolves.toEqualTypeOf<Automation>()
  })
})
