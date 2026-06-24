import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createGetSend } from '../../../../src/resources/analytics/sends/get'
import { BrewApiError } from '../../../../src/core/errors'
import { makeTestHttpClient } from '../../../helpers/http-client'
import { server } from '../../../msw/server'

describe('analytics.sends.get', () => {
  it('GETs /v1/analytics/sends/{sendId} and returns the bare Send row', async () => {
    let url: string | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/analytics/sends/snd_1',
        ({ request }) => {
          url = request.url
          return HttpResponse.json({
            sendId: 'snd_1',
            kind: 'campaign',
            emailId: 'eml_1',
            status: 'sending',
            createdAt: '2026-04-08T12:00:00.000Z',
            updatedAt: '2026-04-08T12:05:00.000Z',
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const get = createGetSend(client)

    const result = await get({ sendId: 'snd_1' })

    expect(new URL(url!).pathname).toBe('/api/v1/analytics/sends/snd_1')
    expect(result.sendId).toBe('snd_1')
    expect(result.status).toBe('sending')
  })

  it('maps a 404 SEND_NOT_FOUND into a BrewApiError', async () => {
    server.use(
      http.get('https://brew.new/api/v1/analytics/sends/:sendId', () =>
        HttpResponse.json(
          {
            error: {
              code: 'SEND_NOT_FOUND',
              type: 'not_found',
              message: 'No send found for that id.',
              suggestion: 'List sends with GET /v1/analytics/sends.',
              docs: 'https://docs.brew.new/api-reference/api/errors',
            },
          },
          { status: 404 }
        )
      )
    )

    const { client } = makeTestHttpClient()
    const get = createGetSend(client)

    await expect(get({ sendId: 'missing' })).rejects.toMatchObject({
      status: 404,
      code: 'SEND_NOT_FOUND',
    })
    await expect(get({ sendId: 'missing' })).rejects.toBeInstanceOf(
      BrewApiError
    )
  })
})
