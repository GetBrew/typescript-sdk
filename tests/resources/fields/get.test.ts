import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createGetField } from '../../../src/resources/fields/get'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('fields.get', () => {
  it('GETs /v1/fields/{fieldName} and returns the BARE definition', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/fields/plan', ({ request }) => {
        url = request.url
        return HttpResponse.json({
          fieldName: 'plan',
          fieldType: 'string',
          isCore: false,
        })
      })
    )

    const { client } = makeTestHttpClient()
    const field = await createGetField(client)('plan')

    expect(new URL(url!).pathname).toBe('/api/v1/fields/plan')
    expect(field.fieldName).toBe('plan')
  })

  it('surfaces an unknown field as 404 FIELD_NOT_FOUND', async () => {
    server.use(
      http.get('https://brew.new/api/v1/fields/:fieldName', () =>
        HttpResponse.json(
          {
            error: {
              code: 'FIELD_NOT_FOUND',
              type: 'not_found',
              message: 'No field named ghost.',
              suggestion: 'List fields with GET /v1/fields.',
              docs: 'https://docs.brew.new/api-reference/api/errors',
            },
          },
          { status: 404 }
        )
      )
    )

    const { client } = makeTestHttpClient()

    await expect(createGetField(client)('ghost')).rejects.toMatchObject({
      status: 404,
      code: 'FIELD_NOT_FOUND',
    })
  })
})
