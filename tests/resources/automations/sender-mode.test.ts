import { http, HttpResponse } from 'msw'
import { describe, expect, expectTypeOf, it } from 'vitest'

import type {
  AutomationNodeInput,
  AutomationSendEmailNodeConfig,
} from '../../../src'
import { createAutomationsResource } from '../../../src/resources/automations/resource'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

// `senderMode` on a Send Email step (brew-v2#2059): `sandbox` sends to the
// organization's members only until a domain verifies, so the step needs no
// `domainId`; `domain` (the default) still takes one.

const TRIGGER_NODE = {
  id: 'trg',
  label: 'On signup',
  type: 'trigger' as const,
  config: { actionType: 'trigger' },
}

const SANDBOX_SEND = {
  id: 'send_welcome',
  label: 'Welcome',
  type: 'sendEmail' as const,
  config: {
    emailId: 'eml_abc',
    emailVersionId: 'emv_abc_v1',
    senderMode: 'sandbox' as const,
    subject: 'Welcome',
    previewText: 'Thanks for signing up',
  },
}

const DOMAIN_SEND = {
  ...SANDBOX_SEND,
  config: {
    ...SANDBOX_SEND.config,
    senderMode: 'domain' as const,
    domainId: 'dom_brand_primary',
  },
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

describe('automations sendEmail senderMode', () => {
  it('types senderMode as the spec does, and a sandbox step without domainId', () => {
    expectTypeOf<AutomationSendEmailNodeConfig['senderMode']>().toEqualTypeOf<
      'domain' | 'sandbox' | undefined
    >()
    expectTypeOf(SANDBOX_SEND).toExtend<AutomationNodeInput>()
    expectTypeOf(DOMAIN_SEND).toExtend<AutomationNodeInput>()

    // A domain send (the default mode) still needs its domainId.
    const noDomainId = {
      emailId: 'eml_abc',
      emailVersionId: 'emv_abc_v1',
      subject: 'Welcome',
      previewText: 'Thanks for signing up',
    }
    expectTypeOf({
      ...DOMAIN_SEND,
      config: { ...noDomainId, senderMode: 'domain' as const },
    }).not.toExtend<AutomationNodeInput>()
    expectTypeOf({
      ...DOMAIN_SEND,
      config: noDomainId,
    }).not.toExtend<AutomationNodeInput>()
    expectTypeOf({
      ...DOMAIN_SEND,
      config: { ...DOMAIN_SEND.config, senderMode: 'team' as const },
    }).not.toExtend<AutomationNodeInput>()
  })

  it('create forwards senderMode on a sandbox step with no domainId', async () => {
    let body: unknown
    server.use(
      http.post('https://brew.new/api/v1/automations', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(ROW, { status: 201 })
      })
    )
    const automations = createAutomationsResource(makeTestHttpClient().client)
    await automations.create({
      name: 'Welcome',
      triggerEventId: 'tri_signup',
      nodes: [TRIGGER_NODE, SANDBOX_SEND],
      connections: [{ from: 'trg', to: 'send_welcome' }],
    })

    expect(body).toEqual({
      name: 'Welcome',
      triggerEventId: 'tri_signup',
      nodes: [TRIGGER_NODE, SANDBOX_SEND],
      connections: [{ from: 'trg', to: 'send_welcome' }],
    })
  })

  it('patch forwards senderMode when a step moves to its domain', async () => {
    let body: unknown
    server.use(
      http.patch(
        'https://brew.new/api/v1/automations/auto_abc',
        async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(ROW)
        }
      )
    )
    const automations = createAutomationsResource(makeTestHttpClient().client)
    await automations.patch({
      automationId: 'auto_abc',
      nodes: [TRIGGER_NODE, DOMAIN_SEND],
      connections: [{ from: 'trg', to: 'send_welcome' }],
    })

    expect(body).toEqual({
      nodes: [TRIGGER_NODE, DOMAIN_SEND],
      connections: [{ from: 'trg', to: 'send_welcome' }],
    })
    const nodes = (body as { nodes: Array<{ config: object }> }).nodes
    expect(nodes[1]?.config).toMatchObject({
      senderMode: 'domain',
      domainId: 'dom_brand_primary',
    })
  })
})
