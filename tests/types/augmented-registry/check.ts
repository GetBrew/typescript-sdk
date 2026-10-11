// Compiled by `tests/types/send-registry.test.ts` with `registry.d.ts`.
// Every `@ts-expect-error` must be used: an unused one is a diagnostic,
// so a registry that stopped rejecting a call fails the test.
import { expectTypeOf } from 'vitest'

import {
  type BrewClient,
  type BrewSendKey,
  type BrewSendPayload,
} from '@brew.new/sdk'

expectTypeOf<BrewSendKey>().toEqualTypeOf<
  'auth.password-reset' | 'order.paid'
>()
expectTypeOf<BrewSendPayload<'order.paid'>>().toEqualTypeOf<{
  email: string
  orderId: string
  total: number
}>()

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
}
