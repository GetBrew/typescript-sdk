import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createDeleteField } from '../../../src/resources/fields/delete'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('fields.delete', () => {
  it('sends DELETE /v1/fields/{fieldName} (name in path) and returns the deletion envelope', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.delete('https://brew.new/api/v1/fields/plan', ({ request }) => {
        capturedRequest = request.clone()
        return HttpResponse.json({ fieldName: 'plan', deleted: true })
      })
    )

    const { client } = makeTestHttpClient()
    const deleteField = createDeleteField(client)

    const result = await deleteField({ fieldName: 'plan' })

    expect(capturedRequest?.method).toBe('DELETE')
    expect(new URL(capturedRequest!.url).pathname).toBe('/api/v1/fields/plan')
    expect(result.fieldName).toBe('plan')
    expect(result.deleted).toBe(true)
  })

  it('is idempotent — deleting an unknown field resolves with { deleted: false }', async () => {
    server.use(
      http.delete('https://brew.new/api/v1/fields/:fieldName', () =>
        HttpResponse.json({ fieldName: 'ghost', deleted: false })
      )
    )

    const { client } = makeTestHttpClient()
    const deleteField = createDeleteField(client)

    const result = await deleteField({ fieldName: 'ghost' })

    expect(result.deleted).toBe(false)
  })
})
