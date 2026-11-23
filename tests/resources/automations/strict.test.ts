import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import type { AutomationNodeInput } from '../../../src'
import { createAutomationsResource } from '../../../src/resources/automations/resource'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const SEND_NODE = {
  id: 'send',
  type: 'sendEmail',
  label: 'Strict email',
  config: {
    emailId: 'email_1',
    emailVersionId: 'version_1',
    domainId: 'domain_1',
    subject: 'Welcome',
    previewText: 'Hello',
    strict: true,
  },
} satisfies AutomationNodeInput

describe('strict automation sends', () => {
  it.each(['create', 'patch'] as const)(
    '%s accepts strict in the public config and sends it unchanged',
    async (method) => {
      let body: unknown
      const capture = async ({ request }: { request: Request }) => {
        body = await request.json()
        return HttpResponse.json({ automationId: 'automation_1' })
      }
      server.use(
        http.post('https://brew.new/api/v1/automations', capture),
        http.patch('https://brew.new/api/v1/automations/automation_1', capture)
      )
      const { client } = makeTestHttpClient()
      const automations = createAutomationsResource(client)
      if (method === 'create') {
        await automations.create({
          name: 'Welcome',
          triggerEventId: 'trigger_1',
          nodes: [SEND_NODE],
          connections: [],
        })
      } else {
        await automations.patch({
          automationId: 'automation_1',
          nodes: [SEND_NODE],
          connections: [],
        })
      }
      expect(body).toMatchObject({ nodes: [{ config: { strict: true } }] })
    }
  )
})
