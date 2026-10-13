import { describe, expect, it } from 'vitest'

import {
  signStandardWebhook,
  verifyStandardWebhook,
  WebhookVerificationError,
} from '../../src/adapters/supabase'

// The published Standard Webhooks vector ("sign function works" in
// standard-webhooks/libraries/javascript/src/webhook.test.ts).
const VECTOR = {
  secret: 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw',
  id: 'msg_p5jXN8AQM9LWM0D4loKWxJek',
  timestamp: 1_614_265_330,
  payload: '{"test": 2432232314}',
  signature: 'v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=',
} as const

const NOW = VECTOR.timestamp * 1000

function headersFor(signature: string, timestamp: number = VECTOR.timestamp) {
  return new Headers({
    'webhook-id': VECTOR.id,
    'webhook-timestamp': String(timestamp),
    'webhook-signature': signature,
  })
}

async function failure(promise: Promise<unknown>) {
  const error: unknown = await promise.catch((caught: unknown) => caught)
  expect(error).toBeInstanceOf(WebhookVerificationError)
  return (error as WebhookVerificationError).reason
}

describe('verifyStandardWebhook', () => {
  it('signs the published vector', async () => {
    await expect(
      signStandardWebhook({
        id: VECTOR.id,
        timestamp: VECTOR.timestamp,
        payload: VECTOR.payload,
        secret: VECTOR.secret,
      })
    ).resolves.toBe(VECTOR.signature)
  })

  it.each([
    ['v1,whsec_ (as Supabase shows it)', `v1,${VECTOR.secret}`],
    ['whsec_', VECTOR.secret],
    ['the bare base64 key', VECTOR.secret.replace('whsec_', '')],
  ])(
    'accepts a valid request with a %s secret and returns the JSON body',
    async (_label, secret) => {
      await expect(
        verifyStandardWebhook({
          payload: VECTOR.payload,
          headers: headersFor(VECTOR.signature),
          secret,
          now: NOW,
        })
      ).resolves.toEqual({ test: 2_432_232_314 })
    }
  )

  it('reads plain-object headers in any case', async () => {
    await expect(
      verifyStandardWebhook({
        payload: VECTOR.payload,
        headers: {
          'Webhook-Id': VECTOR.id,
          'Webhook-Timestamp': String(VECTOR.timestamp),
          'Webhook-Signature': VECTOR.signature,
        },
        secret: VECTOR.secret,
        now: NOW,
      })
    ).resolves.toEqual({ test: 2_432_232_314 })
  })

  it('accepts any one matching v1 signature among several (secret rotation)', async () => {
    const signatures = [
      'v1,Ceo5qEr07ixe2NLpvHk3FH9bwy/WavXrAFQ/9tdO6mc=',
      'v2,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=',
      VECTOR.signature,
    ].join(' ')

    await expect(
      verifyStandardWebhook({
        payload: VECTOR.payload,
        headers: headersFor(signatures),
        secret: VECTOR.secret,
        now: NOW,
      })
    ).resolves.toEqual({ test: 2_432_232_314 })
  })

  it('refuses a tampered body', async () => {
    expect(
      await failure(
        verifyStandardWebhook({
          payload: '{"test": 2432232315}',
          headers: headersFor(VECTOR.signature),
          secret: VECTOR.secret,
          now: NOW,
        })
      )
    ).toBe('invalid_signature')
  })

  it('refuses a signature made with another secret, or only under another scheme', async () => {
    expect(
      await failure(
        verifyStandardWebhook({
          payload: VECTOR.payload,
          headers: headersFor(VECTOR.signature),
          secret: 'whsec_c2VjcmV0LW9mLXNvbWVvbmUtZWxzZQ==',
          now: NOW,
        })
      )
    ).toBe('invalid_signature')
    expect(
      await failure(
        verifyStandardWebhook({
          payload: VECTOR.payload,
          headers: headersFor(VECTOR.signature.replace('v1,', 'v2,')),
          secret: VECTOR.secret,
          now: NOW,
        })
      )
    ).toBe('invalid_signature')
  })

  it('refuses a timestamp more than 5 minutes old or ahead', async () => {
    for (const offsetSeconds of [301, -301]) {
      expect(
        // eslint-disable-next-line no-await-in-loop
        await failure(
          verifyStandardWebhook({
            payload: VECTOR.payload,
            headers: headersFor(VECTOR.signature),
            secret: VECTOR.secret,
            now: NOW + offsetSeconds * 1000,
          })
        )
      ).toBe('timestamp_out_of_tolerance')
    }
    await expect(
      verifyStandardWebhook({
        payload: VECTOR.payload,
        headers: headersFor(VECTOR.signature),
        secret: VECTOR.secret,
        now: NOW + 299 * 1000,
      })
    ).resolves.toBeDefined()
  })

  it('refuses missing headers, a malformed timestamp and a malformed secret', async () => {
    expect(
      await failure(
        verifyStandardWebhook({
          payload: VECTOR.payload,
          headers: new Headers({ 'webhook-id': VECTOR.id }),
          secret: VECTOR.secret,
          now: NOW,
        })
      )
    ).toBe('missing_headers')
    expect(
      await failure(
        verifyStandardWebhook({
          payload: VECTOR.payload,
          headers: new Headers({
            'webhook-id': VECTOR.id,
            'webhook-timestamp': '2021-02-25T15:02:10Z',
            'webhook-signature': VECTOR.signature,
          }),
          secret: VECTOR.secret,
          now: NOW,
        })
      )
    ).toBe('invalid_timestamp')
    expect(
      await failure(
        verifyStandardWebhook({
          payload: VECTOR.payload,
          headers: headersFor(VECTOR.signature),
          secret: 'v1,whsec_not base64!',
          now: NOW,
        })
      )
    ).toBe('invalid_secret')
  })

  it('refuses a signed body that is not JSON', async () => {
    const payload = 'not json'
    const signature = await signStandardWebhook({
      id: VECTOR.id,
      timestamp: VECTOR.timestamp,
      payload,
      secret: VECTOR.secret,
    })

    expect(
      await failure(
        verifyStandardWebhook({
          payload,
          headers: headersFor(signature),
          secret: VECTOR.secret,
          now: NOW,
        })
      )
    ).toBe('invalid_payload')
  })
})
