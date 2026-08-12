import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createAudienceFromEvents } from '../../../src/resources/audiences/from-events'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('audiences.fromEvents', () => {
  it('POSTs the cohort body and returns the async build envelope', async () => {
    let capturedBody: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/audiences/from-events',
        async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json(
            {
              audienceId: 'aud_openers',
              audienceName: 'Recent openers',
              build: { status: 'building' },
            },
            { status: 202 }
          )
        }
      )
    )

    const { client } = makeTestHttpClient()
    const fromEvents = createAudienceFromEvents(client)
    const result = await fromEvents({
      name: 'Recent openers',
      cohort: {
        eventTypes: ['opened'],
        from: '2026-08-01T00:00:00.000Z',
      },
    })

    expect(capturedBody).toMatchObject({
      name: 'Recent openers',
      cohort: { eventTypes: ['opened'] },
    })
    expect(result.audienceId).toBe('aud_openers')
  })
})
