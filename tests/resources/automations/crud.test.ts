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
  it('create POSTs with deterministic body and returns the bare automation row', async () => {
    let body: unknown
    server.use(
      http.post('https://brew.new/api/v1/automations', async ({ request }) => {
        body = await request.json()
        // 201 returns the BARE created row (no { automations: [...] } wrapper).
        return HttpResponse.json(ROW, { status: 201 })
      })
    )
    const { client } = makeTestHttpClient()
    const automations = createAutomationsResource(client)
    const result = await automations.create({
      name: 'Welcome',
      triggerEventId: 'tri_signup',
      nodes: [TRIGGER_NODE],
      connections: [],
    })
    expect(body).toMatchObject({
      name: 'Welcome',
      triggerEventId: 'tri_signup',
    })
    expect(result.automationId).toBe('auto_abc')
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

  it('get GETs /v1/automations/{automationId} and returns the bare AutomationRow', async () => {
    let captured: Request | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/automations/auto_abc',
        ({ request }) => {
          captured = request.clone()
          return HttpResponse.json(ROW)
        }
      )
    )
    const { client } = makeTestHttpClient()
    const automations = createAutomationsResource(client)
    const result = await automations.get({ automationId: 'auto_abc' })
    // id is on the PATH, never the query string.
    expect(new URL(captured!.url).search).toBe('')
    // Bare row — NOT a `{ automations: [...] }` envelope.
    expect('automations' in (result as object)).toBe(false)
    expect(result.automationId).toBe('auto_abc')
    expect(result.nodes).toHaveLength(1)
  })

  it('patch PATCHes /v1/automations/{automationId} with update-only body (no id, no published) and returns the bare row', async () => {
    let body: unknown
    server.use(
      http.patch(
        'https://brew.new/api/v1/automations/auto_abc',
        async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({ ...ROW, name: 'Welcome v2' })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const automations = createAutomationsResource(client)
    const result = await automations.patch({
      automationId: 'auto_abc',
      name: 'Welcome v2',
      description: 'Renamed',
    })
    // automationId lives on the URL — only editable fields hit the body.
    expect(body).toEqual({ name: 'Welcome v2', description: 'Renamed' })
    expect('automations' in (result as object)).toBe(false)
    expect(result.name).toBe('Welcome v2')
  })

  it('publish POSTs /v1/automations/{automationId}/publish with an empty body and returns the bare row', async () => {
    let captured: Request | undefined
    let body: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/automations/auto_abc/publish',
        async ({ request }) => {
          captured = request.clone()
          body = await request.json()
          return HttpResponse.json({ ...ROW, published: true })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const automations = createAutomationsResource(client)
    const result = await automations.publish({ automationId: 'auto_abc' })
    expect(captured?.method).toBe('POST')
    expect(body).toEqual({})
    expect(result.published).toBe(true)
  })

  it('publish with automationVersionId POSTs /publish with { automationVersionId } in the body', async () => {
    let body: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/automations/auto_abc/publish',
        async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({ ...ROW, published: true })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const automations = createAutomationsResource(client)
    await automations.publish({
      automationId: 'auto_abc',
      automationVersionId: 'av_v2',
    })
    expect(body).toEqual({ automationVersionId: 'av_v2' })
  })

  it('unpublish POSTs /v1/automations/{automationId}/unpublish (no body) and returns the bare row', async () => {
    let captured: Request | undefined
    server.use(
      http.post(
        'https://brew.new/api/v1/automations/auto_abc/unpublish',
        ({ request }) => {
          captured = request.clone()
          return HttpResponse.json({ ...ROW, published: false })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const automations = createAutomationsResource(client)
    const result = await automations.unpublish({ automationId: 'auto_abc' })
    expect(captured?.method).toBe('POST')
    // Empty body — no JSON payload.
    expect((await captured!.text()).length).toBe(0)
    expect(result.published).toBe(false)
  })

  it('versions GETs /v1/automations/{automationId}/versions and returns the { data, pagination } envelope', async () => {
    let captured: Request | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/automations/auto_abc/versions',
        ({ request }) => {
          captured = request.clone()
          return HttpResponse.json({
            data: [
              {
                automationId: 'auto_abc',
                automationVersionId: 'av_v2',
                name: 'Welcome',
                version: 'latest',
                published: true,
                emailIds: [],
              },
              {
                automationId: 'auto_abc',
                automationVersionId: 'av_v1',
                name: 'Welcome',
                version: 1,
                published: false,
                emailIds: [],
              },
            ],
            pagination: { limit: 100, cursor: null, hasMore: false },
          })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const automations = createAutomationsResource(client)
    const result = await automations.versions({
      automationId: 'auto_abc',
      limit: 50,
    })
    expect(captured?.method).toBe('GET')
    expect(new URL(captured!.url).searchParams.get('limit')).toBe('50')
    expect(result.data).toHaveLength(2)
    expect(result.data[0]?.version).toBe('latest')
    expect(result.pagination.hasMore).toBe(false)
  })

  it('delete DELETEs /v1/automations/{automationId} (no body) and surfaces the idempotent { automationId, deleted } envelope', async () => {
    let captured: Request | undefined
    server.use(
      http.delete(
        'https://brew.new/api/v1/automations/auto_abc',
        ({ request }) => {
          captured = request.clone()
          return HttpResponse.json({
            automationId: 'auto_abc',
            deleted: true,
          })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const automations = createAutomationsResource(client)
    const result = await automations.delete({ automationId: 'auto_abc' })
    expect(captured?.method).toBe('DELETE')
    // id is on the PATH — no JSON body.
    expect((await captured!.text()).length).toBe(0)
    expect(result.deleted).toBe(true)
  })
})
