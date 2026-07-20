import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createPause } from '../../../src/resources/sends/pause'
import { createResume } from '../../../src/resources/sends/resume'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('sends pause and resume', () => {
  it('uses the reversible action routes for a gradual send', async () => {
    server.use(
      http.post('https://brew.new/api/v1/sends/send%2F123/pause', () =>
        HttpResponse.json({ sendId: 'send/123', status: 'paused' })
      ),
      http.post('https://brew.new/api/v1/sends/send%2F123/resume', () =>
        HttpResponse.json({ sendId: 'send/123', status: 'sending' })
      )
    )

    const { client } = makeTestHttpClient()
    const pause = createPause(client)
    const resume = createResume(client)

    await expect(pause('send/123')).resolves.toEqual({
      sendId: 'send/123',
      status: 'paused',
    })
    await expect(resume('send/123')).resolves.toEqual({
      sendId: 'send/123',
      status: 'sending',
    })
  })
})
