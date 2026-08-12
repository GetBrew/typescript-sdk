import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createDuplicateAudience } from '../../../src/resources/audiences/duplicate'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('audiences.duplicate', () => {
  it('POSTs the encoded audience path with no body', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.post(
        'https://brew.new/api/v1/audiences/aud%2Fsource/duplicate',
        ({ request }) => {
          capturedRequest = request
          return HttpResponse.json({
            audienceId: 'aud_copy',
            name: 'Source (copy)',
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const duplicate = createDuplicateAudience(client)
    const result = await duplicate({ audienceId: 'aud/source' })

    expect(capturedRequest?.method).toBe('POST')
    expect(result.audienceId).toBe('aud_copy')
  })
})
