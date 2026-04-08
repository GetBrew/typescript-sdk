import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createDeleteField } from '../../../src/resources/fields/delete'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('fields.delete', () => {
  it('sends DELETE /v1/fields with { fieldName } body and returns the success envelope', async () => {
    let capturedRequest: Request | undefined
    let capturedBody: unknown
    server.use(
      http.delete('https://brew.new/api/v1/fields', async ({ request }) => {
        capturedRequest = request.clone()
        capturedBody = await request.json()
        return HttpResponse.json({ success: true })
      })
    )

    const { client } = makeTestHttpClient()
    const deleteField = createDeleteField(client)

    const result = await deleteField({ fieldName: 'plan' })

    expect(capturedRequest?.method).toBe('DELETE')
    expect(capturedBody).toEqual({ fieldName: 'plan' })
    expect(result.success).toBe(true)
  })
})
