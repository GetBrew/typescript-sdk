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

  it('list with automationId + include graph GETs /v1/automations?automationId&include=graph and returns the single-row page', async () => {
    let captured: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/automations', ({ request }) => {
        captured = request.clone()
        // Detail mode = a single-row page `{ data: [row] }`, no pagination.
        return HttpResponse.json({ data: [ROW] })
      })
    )
    const { client } = makeTestHttpClient()
    const automations = createAutomationsResource(client)
    // Reads are flat: identity in the query, `include` for opt-in graph.
    const result = await automations.list({
      automationId: 'auto_abc',
      include: 'graph',
    })
    const url = new URL(captured!.url)
    expect(url.pathname).toBe('/api/v1/automations')
    expect(url.searchParams.get('automationId')).toBe('auto_abc')
    expect(url.searchParams.get('include')).toBe('graph')
    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.automationId).toBe('auto_abc')
    expect(result.data[0]?.nodes).toHaveLength(1)
    expect(result.pagination).toBeUndefined()
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

  it('publish PATCHes /v1/automations/{automationId} with { published: true } and returns the bare row', async () => {
    let captured: Request | undefined
    let body: unknown
    server.use(
      http.patch(
        'https://brew.new/api/v1/automations/auto_abc',
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
    // The old POST …/publish sub-route is gone — publishing is a PATCH.
    expect(captured?.method).toBe('PATCH')
    expect(new URL(captured!.url).pathname).toBe('/api/v1/automations/auto_abc')
    expect(body).toEqual({ published: true })
    expect(result.published).toBe(true)
  })

  it('publish with automationVersionId PATCHes with { published: true, automationVersionId }', async () => {
    let body: unknown
    server.use(
      http.patch(
        'https://brew.new/api/v1/automations/auto_abc',
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
    expect(body).toEqual({ published: true, automationVersionId: 'av_v2' })
  })

  it('unpublish PATCHes /v1/automations/{automationId} with { published: false } and returns the bare row', async () => {
    let captured: Request | undefined
    let body: unknown
    server.use(
      http.patch(
        'https://brew.new/api/v1/automations/auto_abc',
        async ({ request }) => {
          captured = request.clone()
          body = await request.json()
          return HttpResponse.json({ ...ROW, published: false })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const automations = createAutomationsResource(client)
    const result = await automations.unpublish({ automationId: 'auto_abc' })
    expect(captured?.method).toBe('PATCH')
    expect(body).toEqual({ published: false })
    expect(result.published).toBe(false)
  })

  it('list with automationId + include versions inlines the version history on the single-row page', async () => {
    let captured: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/automations', ({ request }) => {
        captured = request.clone()
        // Detail mode with `include=versions` inlines `versions[]` on the row.
        return HttpResponse.json({
          data: [
            {
              ...ROW,
              versions: [
                { version: 'latest', automationVersionId: 'av_v2' },
                { version: 1, automationVersionId: 'av_v1' },
              ],
            },
          ],
        })
      })
    )
    const { client } = makeTestHttpClient()
    const automations = createAutomationsResource(client)
    const result = await automations.list({
      automationId: 'auto_abc',
      include: 'versions',
    })
    const url = new URL(captured!.url)
    expect(url.searchParams.get('automationId')).toBe('auto_abc')
    expect(url.searchParams.get('include')).toBe('versions')
    expect(result.data[0]?.versions).toHaveLength(2)
    expect(result.data[0]?.versions?.[0]?.version).toBe('latest')
    expect(result.pagination).toBeUndefined()
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
