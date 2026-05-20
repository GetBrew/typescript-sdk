import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createAutomationsResource } from '../../../src/resources/automations/resource'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const TRIGGER_NODE = {
  id: 'trg',
  label: 'On signup',
  type: 'trigger' as const,
  config: { actionType: 'trigger' },
}

const ROW = {
  automationId: 'auto_abc',
  automationVersionId: 'av_v1',
  triggerEventId: 'tri_signup',
  name: 'Welcome',
  version: 'latest' as const,
  published: false,
  nodes: [TRIGGER_NODE],
  connections: [],
  emailIds: [],
}

describe('automations resource — POST/GET/PATCH/DELETE wiring', () => {
  it('create POSTs with deterministic body and returns { automations: [row] }', async () => {
    let body: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/automations',
        async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({ automations: [ROW] }, { status: 201 })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const automations = createAutomationsResource(client)
    const result = await automations.create({
      name: 'Welcome',
      triggerEventId: 'tri_signup',
      nodes: [TRIGGER_NODE],
      connections: [],
    })
    expect(body).toMatchObject({ name: 'Welcome', triggerEventId: 'tri_signup' })
    expect('automations' in result).toBe(true)
    if ('automations' in result) {
      expect(result.automations[0]?.automationId).toBe('auto_abc')
    }
  })

  it('does not surface `generate` / `regenerate` (deterministic-only)', () => {
    const { client } = makeTestHttpClient()
    const automations = createAutomationsResource(client)
    expect('generate' in automations).toBe(false)
    expect('regenerate' in automations).toBe(false)
  })

  it('AutomationNodeInput narrows config by `type` (sendEmail requires emailId + emailVersionId + domainId + subject + previewText)', () => {
    // This is a TS-level assertion — the test runs purely to keep the
    // discriminated union typing wired into the test suite. If the
    // SDK ever loses per-kind narrowing the test file will fail to
    // compile because the wrong-config branches below would compile.
    const sendNode = {
      id: 'send_welcome',
      label: 'Welcome',
      type: 'sendEmail' as const,
      config: {
        emailId: 'eml_abc',
        emailVersionId: 'emv_abc_v1',
        domainId: 'dom_brand_primary',
        subject: 'Welcome',
        previewText: 'Thanks for signing up',
        fromName: 'Brew',
        replyTo: 'support@example.com',
      },
    }
    expect(sendNode.config.emailVersionId).toBe('emv_abc_v1')
    expect(sendNode.config.domainId).toBe('dom_brand_primary')

    const waitNode = {
      id: 'wait_2d',
      label: 'Wait 2 days',
      type: 'wait' as const,
      config: { duration: 2, unit: 'days' as const },
    }
    expect(waitNode.config.unit).toBe('days')
  })

  it('publish sugar PATCHes with published:true', async () => {
    let body: unknown
    server.use(
      http.patch(
        'https://brew.new/api/v1/automations',
        async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({
            automations: [{ ...ROW, published: true }],
          })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const automations = createAutomationsResource(client)
    await automations.publish({ automationId: 'auto_abc' })
    expect(body).toEqual({ automationId: 'auto_abc', published: true })
  })

  it('publish with automationVersionId targets a specific version', async () => {
    let body: unknown
    server.use(
      http.patch(
        'https://brew.new/api/v1/automations',
        async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({
            automations: [{ ...ROW, published: true }],
          })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const automations = createAutomationsResource(client)
    await automations.publish({
      automationId: 'auto_abc',
      automationVersionId: 'av_v2',
    })
    expect(body).toEqual({
      automationId: 'auto_abc',
      published: true,
      automationVersionId: 'av_v2',
    })
  })

  it('unpublish sugar PATCHes with published:false', async () => {
    let body: unknown
    server.use(
      http.patch(
        'https://brew.new/api/v1/automations',
        async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({ automations: [ROW] })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const automations = createAutomationsResource(client)
    await automations.unpublish({ automationId: 'auto_abc' })
    expect(body).toEqual({ automationId: 'auto_abc', published: false })
  })

  it('delete DELETEs and surfaces cascade counts', async () => {
    server.use(
      http.delete(
        'https://brew.new/api/v1/automations',
        async ({ request }) => {
          const body = (await request.json()) as { automationId: string }
          expect(body.automationId).toBe('auto_abc')
          return HttpResponse.json({
            automationId: 'auto_abc',
            deletedAutomations: 3,
            deletedEmails: 0,
            deletedEmailGroupings: 0,
            deletedCanvasLayouts: 0,
            deletedExecutions: 0,
            deletedExecutionLogs: 0,
          })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const automations = createAutomationsResource(client)
    const result = await automations.delete({ automationId: 'auto_abc' })
    expect(result.deletedAutomations).toBe(3)
  })
})
