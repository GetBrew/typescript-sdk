import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createListFields } from '../../../src/resources/fields/list'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('fields.list', () => {
  it('sends GET /v1/fields and returns the fields envelope', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/fields', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({
          fields: [
            { name: 'plan', type: 'string' },
            { name: 'signupDate', type: 'date' },
          ],
        })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListFields(client)

    const result = await list()

    expect(capturedRequest?.method).toBe('GET')
    expect(new URL(capturedRequest!.url).pathname).toBe('/api/v1/fields')
    expect(result.fields).toHaveLength(2)
    expect(result.fields[0]?.name).toBe('plan')
  })
})
