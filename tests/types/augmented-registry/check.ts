// Compiled by `tests/types/send-registry.test.ts` with `registry.d.ts`.
// Every `@ts-expect-error` must be used: an unused one is a diagnostic,
// so a registry that stopped rejecting a call fails the test.
import { expectTypeOf } from 'vitest'

import {
  type BrewClient,
  type BrewSendKey,
  type BrewSendPayload,
  type BrewSendPayloadFor,
} from '@brew.new/sdk'

expectTypeOf<BrewSendKey>().toEqualTypeOf<
  'auth.password-reset' | 'order.paid'
>()
expectTypeOf<BrewSendPayload<'order.paid'>>().toEqualTypeOf<{
  email: string
  orderId: string
  total: number
}>()
// A literal key takes its own payload; a union key, every member's at once.
expectTypeOf<BrewSendPayloadFor<'order.paid'>>().toEqualTypeOf<
  BrewSendPayload<'order.paid'>
>()
expectTypeOf<
  BrewSendPayloadFor<'auth.password-reset' | 'order.paid'>
>().toEqualTypeOf<
  BrewSendPayload<'auth.password-reset'> & BrewSendPayload<'order.paid'>
>()

export async function calls(brew: BrewClient): Promise<void> {
  await brew.send('auth.password-reset', {
    email: 'jane@example.com',
    confirmationUrl: 'https://app.example.com/reset',
  })
  await brew.send(
    'order.paid',
    { email: 'kim@example.com', orderId: 'ord_1', total: 42 },
    { idempotencyKey: 'order.paid:ord_1' }
  )

  // @ts-expect-error: not a registered key.
  await brew.send('auth.unknown', { email: 'jane@example.com' })

  await brew.send('auth.password-reset', {
    email: 'jane@example.com',
    // @ts-expect-error: `confirmationUrl` must be a string.
    confirmationUrl: 42,
  })

  // @ts-expect-error: `confirmationUrl` is required for this key.
  await brew.send('auth.password-reset', { email: 'jane@example.com' })

  await brew.withBrand('brand_x').send('order.paid', {
    email: 'kim@example.com',
    orderId: 'ord_2',
    // @ts-expect-error: `total` is a number for this key.
    total: '42',
  })

  await brew.send(
    'auth.password-reset',
    {
      email: 'jane@example.com',
      confirmationUrl: 'https://app.example.com/reset',
    },
    { raw: true }
  )
}

// A key typed as a union could be either key at runtime, so the payload must
// be checked against the key it is paired with, not against either payload.
export async function unionKeyCalls(
  brew: BrewClient,
  key: 'auth.password-reset' | 'order.paid',
  pair:
    | readonly ['auth.password-reset', BrewSendPayload<'auth.password-reset'>]
    | readonly ['order.paid', BrewSendPayload<'order.paid'>]
): Promise<void> {
  // @ts-expect-error: `key` may be 'order.paid', which needs `orderId` and `total`.
  await brew.send(key, {
    email: 'jane@example.com',
    confirmationUrl: 'https://app.example.com/reset',
  })

  await brew.send(
    key,
    // @ts-expect-error: still refused with { raw: true } (no `confirmationUrl`).
    { email: 'jane@example.com', orderId: 'o', total: 1 },
    { raw: true }
  )

  // A payload that satisfies every key the union can hold is accepted.
  await brew.send(key, {
    email: 'jane@example.com',
    confirmationUrl: 'https://app.example.com/reset',
    orderId: 'ord_3',
    total: 3,
  })

  const anyKey: BrewSendKey = key
  // @ts-expect-error: the full key union is refused the same way.
  await brew.send(anyKey, {
    email: 'jane@example.com',
    confirmationUrl: 'https://app.example.com/reset',
  })

  // A correlated key and payload still compiles once narrowed.
  if (pair[0] === 'order.paid') {
    await brew.send(pair[0], pair[1])
  } else {
    await brew.send(pair[0], pair[1])
  }
}
