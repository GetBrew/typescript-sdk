import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createCreateField } from '../../../src/resources/fields/create'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('fields.create', () => {
  it('sends POST /v1/fields with { fieldName, fieldType } body and returns the bare created field row', async () => {
    let capturedRequest: Request | undefined
    let capturedBody: unknown
    server.use(
      http.post('https://brew.new/api/v1/fields', async ({ request }) => {
        capturedRequest = request.clone()
        capturedBody = await request.json()
        return HttpResponse.json(
          { fieldName: 'plan', fieldType: 'string' },
          { status: 201 }
        )
      })
    )

    const { client } = makeTestHttpClient()
    const create = createCreateField(client)

    const result = await create({ fieldName: 'plan', fieldType: 'string' })

    expect(capturedRequest?.method).toBe('POST')
    expect(capturedBody).toEqual({ fieldName: 'plan', fieldType: 'string' })
    expect(result.fieldName).toBe('plan')
    expect(result.fieldType).toBe('string')
  })

  it('accepts the bool field type (note: not "boolean")', async () => {
    let capturedBody: unknown
    server.use(
      http.post('https://brew.new/api/v1/fields', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(
          { fieldName: 'isVip', fieldType: 'bool' },
          { status: 201 }
        )
      })
    )

    const { client } = makeTestHttpClient()
    const create = createCreateField(client)

    await create({ fieldName: 'isVip', fieldType: 'bool' })

    expect(capturedBody).toEqual({ fieldName: 'isVip', fieldType: 'bool' })
  })
})
