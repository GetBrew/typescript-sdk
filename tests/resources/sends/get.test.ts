import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createGetSend } from '../../../src/resources/sends/get'
import { BrewApiError } from '../../../src/core/errors'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('sends.get', () => {
  it('GETs /v1/sends?emailId= and returns the one-element { sends } envelope', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/sends', ({ request }) => {
        url = request.url
        return HttpResponse.json({
          sends: [
            {
              emailId: 'eml_1',
              status: 'sending',
              createdAt: '2026-04-08T12:00:00.000Z',
              updatedAt: '2026-04-08T12:05:00.000Z',
            },
          ],
        })
      })
    )

    const { client } = makeTestHttpClient()
    const get = createGetSend(client)

    const result = await get({ emailId: 'eml_1' })

    expect(new URL(url!).searchParams.get('emailId')).toBe('eml_1')
    expect(result.sends).toHaveLength(1)
    expect(result.sends[0]?.status).toBe('sending')
  })

  it('maps a 404 SEND_NOT_FOUND into a BrewApiError', async () => {
    server.use(
      http.get('https://brew.new/api/v1/sends', () =>
        HttpResponse.json(
          {
            error: {
              code: 'SEND_NOT_FOUND',
              type: 'not_found',
              message: 'No send found for that email.',
              suggestion: 'List sends with GET /v1/sends.',
              docs: 'https://docs.brew.new/api-reference/api/errors',
            },
          },
          { status: 404 }
        )
      )
    )

    const { client } = makeTestHttpClient()
    const get = createGetSend(client)

    await expect(get({ emailId: 'missing' })).rejects.toMatchObject({
      status: 404,
      code: 'SEND_NOT_FOUND',
    })
    await expect(get({ emailId: 'missing' })).rejects.toBeInstanceOf(
      BrewApiError
    )
  })
})
