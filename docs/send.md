# `brew.send`

Send an app email (a password reset, a magic link, an order receipt) by its
trigger key:

```ts
import { createBrewClient } from '@brew.new/sdk'

const brew = createBrewClient({ apiKey: process.env.BREW_API_KEY! })

await brew.send(
  'auth.password-reset',
  {
    email: 'jane@example.com',
    confirmationUrl: 'https://app.example.com/reset?token=abc',
    appName: 'Acme',
  },
  { idempotencyKey: `auth.password-reset:${resetTokenId}` }
)
```

| Call                                                           | HTTP                                                       | Scope         |
| -------------------------------------------------------------- | ---------------------------------------------------------- | ------------- |
| `brew.send(key, payload, options?)`                            | `POST /v1/automations/triggers/by-key/{triggerKey}/fire`   | `automations` |
| `brew.automations.triggers.fireByKey({ triggerKey, payload })` | the same route; the object form, with a `TPayload` generic | `automations` |

## How it works

A key names a trigger in your brand. The trigger starts a published
automation, and the automation's send step holds the design, the subject
and the sender. `brew.send` fires that trigger with your `payload`:

- `payload.email` is the recipient (required on every send).
- Every other field is data for the email. The design reads it as
  `{{ trigger.confirmationUrl }}` and so on. Nested objects and arrays are
  fine (JSON only, up to 64 KiB).
- The key resolves inside the brand the API key acts for. An
  organization-scoped key names the brand: `brew.withBrand(brandId).send(…)`.

`npx brew.new init` sets the keys up for you: it creates each trigger with
its key, the email design, and the published automation. To wire one by
hand, create a trigger with a `key`
(`brew.automations.triggers.create({ title, key: 'order.paid', payloadSchema })`,
or `patch` an existing one), attach an automation to it, and publish.

Keys are lowercase letters, digits, `.`, `_` and `-`, up to 64 characters
(`order.paid`, `auth.password-reset`), unique in the brand. `kit`, `by-key`,
`brew.*` and `auth.*` keys outside the starter kit are reserved.

## `brew.send` or `brew.emails.send`?

|                    | `brew.send(key, payload)`                          | `brew.emails.send({ emailId, … })`                  |
| ------------------ | -------------------------------------------------- | --------------------------------------------------- |
| Sends              | the app email behind a trigger key, to one person  | a saved design to an audience, or one test delivery |
| Content comes from | the published automation (design, subject, sender) | the design you name                                 |
| Typical use        | auth emails, receipts, lifecycle emails from code  | campaigns and test sends                            |

## Response

`brew.send` resolves to the accepted fire, the same body as
`automations.triggers.fire` plus `triggerKey`:

```ts
const result = await brew.send('order.paid', {
  email: 'kim@example.com',
  orderId: 'ord_1042',
})
result.triggerInstanceId // read it back: automations.triggerInstances.get(id)
result.automationRunIds // the runs it started
result.notStarted // matched automations that could not start, with `reason`
result.status // 'triggered', or 'replayed' for a repeated idempotency key
```

Pass `{ raw: true }` as the third argument for `{ data, status, headers,
requestId }`.

## Idempotency

Every `brew.send` carries an `Idempotency-Key`. The SDK generates one per
call, so its own retries never send twice. Pass your own when the CALL can
repeat (a webhook redelivery, a job retry): the same key returns the
original fire with `status: 'replayed'` and sends nothing. Derive it from
the business event, for example `` `order.paid:${orderId}` ``. The key is
matched against the resolved trigger, so a by-key and a by-id fire of one
trigger with the same key replay each other for 90 days.

## Errors

A refused send throws `BrewApiError` (see [`errors.md`](./errors.md)):

| Status | `code`                    | Meaning                                                     |
| ------ | ------------------------- | ----------------------------------------------------------- |
| 404    | `TRIGGER_KEY_NOT_FOUND`   | No trigger in the brand has this key.                       |
| 400    | `INVALID_PAYLOAD`         | The payload does not match the trigger's `payloadSchema`.   |
| 422    | `NO_PUBLISHED_AUTOMATION` | The trigger has no published automation to send with.       |
| 409    | `IDEMPOTENCY_CONFLICT`    | The idempotency key was reused with a different payload.    |
| 429    | `RATE_LIMITED`            | Retried for you up to `maxRetries`, honoring `Retry-After`. |

```ts
import { BrewApiError } from '@brew.new/sdk'

try {
  await brew.send('auth.magic-link', { email, confirmationUrl })
} catch (error) {
  if (error instanceof BrewApiError && error.code === 'TRIGGER_KEY_NOT_FOUND') {
    // run `npx brew.new init`, or set `key` on the trigger
  }
  throw error
}
```

## Typed keys and payloads

`brew.send` accepts any string key and an `{ email, …JSON }` payload until
you declare your keys. Augment `BrewTriggerKeyRegistry` once and every call
site is checked: an unknown key or a wrong payload stops compiling.

```ts
// brew-keys.d.ts (any .d.ts or .ts file your tsconfig includes)
import '@brew.new/sdk'

declare module '@brew.new/sdk' {
  interface BrewTriggerKeyRegistry {
    'auth.password-reset': {
      email: string
      confirmationUrl: string
      appName?: string
    }
    'order.paid': { email: string; orderId: string; total: number }
  }
}
```

```ts
await brew.send('order.paid', { email, orderId, total: 42 }) // ok
await brew.send('order.payed', { email }) // error: not a registered key
await brew.send('order.paid', { email, orderId }) // error: `total` missing
```

`BrewSendKey` and `BrewSendPayload<K>` expose the same types for your own
helpers.

## Starter-kit keys

The starter kit (`npx brew.new init`) uses these keys. The auth emails share
one payload: `email`, `appName`, and as each email needs them `userName`,
`confirmationUrl`, `otp`, `expiresInMinutes`, `newEmail`, `inviterName`,
`organizationName` and `noticeType`.

| Key                        | Sent when                                         |
| -------------------------- | ------------------------------------------------- |
| `auth.verify-email`        | a new account confirms its address                |
| `auth.magic-link`          | a user signs in by link                           |
| `auth.otp`                 | a user signs in with a one-time code              |
| `auth.password-reset`      | a user resets their password                      |
| `auth.invite`              | a user is invited to an account or team           |
| `auth.email-change`        | a user changes their address                      |
| `auth.reauthentication`    | a sensitive action needs a fresh code             |
| `auth.security-notice`     | the account changed (password, email, phone, MFA) |
| `lifecycle.welcome`        | a user signs up                                   |
| `lifecycle.trial-ending`   | a trial is about to end                           |
| `lifecycle.payment-failed` | a payment fails                                   |
| `lifecycle.win-back`       | a user has gone quiet                             |
