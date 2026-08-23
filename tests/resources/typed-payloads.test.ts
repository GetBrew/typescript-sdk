import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { createTriggersResource } from '../../src/resources/automations/triggers/resource'
import { createSendEmail } from '../../src/resources/emails/send'
import { makeTestHttpClient } from '../helpers/http-client'
import { server } from '../msw/server'

/**
 * The payload generics are TYPE-LEVEL contracts (pin a type from your
 * codebase — hand-written or `brew-cli types` output — and the compiler
 * checks every fire/send call site). Runtime behavior is unchanged.
 */

type SignupPayload = {
  email: string
  seats?: number
}

type ReceiptPayload = {
  total: number
  note?: string
}

describe('typed payload generics', () => {
  it('fire<TPayload> type-checks the payload and leaves the wire unchanged', async () => {
    let body: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/automations/triggers/tri_signup/fire',
        async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({
            success: true,
            status: 'triggered',
            code: 'TRIGGERED',
            message: 'ok',
            triggerEventId: 'tri_signup',
            receivedAt: '2026-08-22T00:00:00.000Z',
            details: {},
          })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const triggers = createTriggersResource(client)

    await triggers.fire<SignupPayload>({
      triggerEventId: 'tri_signup',
      payload: { email: 'jane@example.com', seats: 3 },
    })
    expect(body).toEqual({
      payload: { email: 'jane@example.com', seats: 3 },
    })

    const missingRequired: Parameters<typeof triggers.fire<SignupPayload>>[0] =
      {
        triggerEventId: 'tri_signup',
        // @ts-expect-error — `email` is required by the pinned contract.
        payload: { seats: 3 },
      }
    expect(missingRequired).toBeDefined()
  })

  it('send<TPayload> types the transactional payload variant', async () => {
    let body: unknown
    server.use(
      http.post('https://brew.new/api/v1/sends', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(
          { status: 'queued', sendId: 'snd_1', runId: 'run_1' },
          { status: 202 }
        )
      })
    )
    const { client } = makeTestHttpClient()
    const sendEmail = createSendEmail(client)

    await sendEmail<ReceiptPayload>({
      transactionId: 'txn_receipt',
      to: 'jane@example.com',
      payload: { total: 42, note: 'thanks' },
    })
    expect(body).toEqual({
      transactionId: 'txn_receipt',
      to: 'jane@example.com',
      payload: { total: 42, note: 'thanks' },
    })

    const wrongType: Parameters<typeof sendEmail<ReceiptPayload>>[0] = {
      transactionId: 'txn_receipt',
      to: 'jane@example.com',
      // @ts-expect-error — `total` must be a number under the pinned contract.
      payload: { total: 'forty-two' },
    }
    expect(wrongType).toBeDefined()
  })
})
