import { http, HttpResponse } from 'msw'
import { describe, expect, expectTypeOf, it } from 'vitest'

import type { operations } from '../../../src/generated/openapi-types'
import {
  createRestoreEmail,
  type RestoreEmailResponse,
} from '../../../src/resources/emails/restore'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('emails.restore', () => {
  it('restores a saved version by id and returns the restored design', async () => {
    let capturedBody: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/emails/email%2F123/restore',
        async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json({
            emailId: 'email/123',
            emailVersionId: 'version_restored',
            html: '<html><body>Restored</body></html>',
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const restore = createRestoreEmail(client)
    const result = await restore({
      emailId: 'email/123',
      emailVersionId: 'version_1',
    })

    expect(capturedBody).toEqual({ emailVersionId: 'version_1' })
    expect(result).toMatchObject({
      emailId: 'email/123',
      emailVersionId: 'version_restored',
    })
  })

  it("is typed as the spec's 200 body, the restored design", () => {
    expectTypeOf<RestoreEmailResponse>().toEqualTypeOf<
      operations['restoreEmailVersion']['responses'][200]['content']['application/json']
    >()
  })
})
