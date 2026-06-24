import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createListFields } from '../../../src/resources/fields/list'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('fields.list', () => {
  it('sends GET /v1/fields and returns the { data, pagination } envelope', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/fields', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({
          data: [
            { fieldName: 'plan', fieldType: 'string', isCore: false },
            { fieldName: 'signupDate', fieldType: 'date', isCore: false },
          ],
          pagination: { limit: 100, cursor: null, hasMore: false },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListFields(client)

    const result = await list()

    expect(capturedRequest?.method).toBe('GET')
    expect(new URL(capturedRequest!.url).pathname).toBe('/api/v1/fields')
    expect(result.data).toHaveLength(2)
    expect(result.data[0]?.fieldName).toBe('plan')
    expect(result.data[0]?.fieldType).toBe('string')
  })
})
