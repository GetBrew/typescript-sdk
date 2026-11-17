import { HttpResponse, http } from 'msw'
import { expect, it } from 'vitest'
import type {
  ConnectIntegrationInput,
  IntegrationConnection,
} from '../../../src'
import { createIntegrationsResource } from '../../../src/resources/integrations/resource'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

it('forwards create-only setup and preserves a competing connection refusal', async () => {
  const input: ConnectIntegrationInput = {
    provider: 'supabase_auth',
    signingSecret: 'v1,whsec_ZHVtbXktc2VjcmV0',
    createOnly: true,
  }
  let body: unknown
  server.use(
    http.put(
      'https://brew.new/api/v1/integrations/supabase_auth/connection',
      async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(
          {
            error: {
              code: 'INTEGRATION_ALREADY_CONNECTED',
              type: 'invalid_request',
              message: 'A different hook is already connected.',
            },
          },
          { status: 409 }
        )
      }
    )
  )
  const { client } = makeTestHttpClient()
  await expect(
    createIntegrationsResource(client).connect(input)
  ).rejects.toMatchObject({
    status: 409,
    code: 'INTEGRATION_ALREADY_CONNECTED',
  })
  expect(body).toMatchObject({ createOnly: true })
})

it.each([undefined, 'ins_verified'])(
  'preserves optional signed-instance proof %s',
  async (verifiedInstanceId) => {
    const connection: IntegrationConnection = {
      provider: 'clerk',
      connectionId: 'connection',
      webhookUrl: 'https://example.com/hook',
      status: 'active',
      ...(verifiedInstanceId === undefined ? {} : { verifiedInstanceId }),
    }
    server.use(
      http.get('https://brew.new/api/v1/integrations/clerk/connection', () =>
        HttpResponse.json(connection)
      )
    )
    const { client } = makeTestHttpClient()
    const result =
      await createIntegrationsResource(client).getConnection('clerk')
    expect(result.verifiedInstanceId).toBe(verifiedInstanceId)
  }
)
