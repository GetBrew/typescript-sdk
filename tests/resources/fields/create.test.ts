import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createCreateField } from '../../../src/resources/fields/create'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('fields.create', () => {
  it('sends POST /v1/fields with the field body and returns the success envelope', async () => {
    let capturedRequest: Request | undefined
    let capturedBody: unknown
    server.use(
      http.post('https://brew.new/api/v1/fields', async ({ request }) => {
        capturedRequest = request.clone()
        capturedBody = await request.json()
        return HttpResponse.json({ success: true }, { status: 201 })
      })
    )

    const { client } = makeTestHttpClient()
    const create = createCreateField(client)

    const result = await create({ name: 'plan', type: 'string' })

    expect(capturedRequest?.method).toBe('POST')
    expect(capturedBody).toEqual({ name: 'plan', type: 'string' })
    expect(result.success).toBe(true)
  })
})
