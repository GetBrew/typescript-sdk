import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createListIntegrations } from '../../../src/resources/integrations/list'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('integrations.list', () => {
  it('GETs /v1/integrations and returns the { integrations } catalog', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/integrations', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({
          integrations: [
            {
              provider: 'clerk',
              connected: true,
              events: [
                {
                  eventType: 'user.created',
                  title: 'User created',
                  category: 'users',
                  fieldKeys: ['email', 'firstName'],
                  requiredFieldKeys: ['email'],
                  provisioned: true,
                },
              ],
            },
          ],
        })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListIntegrations(client)

    const result = await list()

    expect(capturedRequest?.method).toBe('GET')
    expect(new URL(capturedRequest!.url).pathname).toBe('/api/v1/integrations')
    expect(result.integrations[0]?.provider).toBe('clerk')
    expect(result.integrations[0]?.events[0]?.eventType).toBe('user.created')
  })

  it('threads the provider filter into the query string', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/integrations', ({ request }) => {
        url = request.url
        return HttpResponse.json({ integrations: [] })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListIntegrations(client)

    await list({ provider: 'stripe' })

    expect(new URL(url!).searchParams.get('provider')).toBe('stripe')
  })
})
