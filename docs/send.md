# `brew.send`

Send an app email (a password reset, a magic link, a welcome email) by its
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

> **Availability.** The by-key route and trigger keys ship in the Brew
> platform release that deploys GetBrew/brew-v2#2169. SDK 13.1.0 is not
> released before that deploy: until then the route answers `404` and
> trigger rows carry no `key`.

## How it works

A key names a trigger in your brand. The trigger starts a published
automation, and the automation's send step holds the design, the subject
and the sender. `brew.send` fires that trigger with your `payload`:

- `payload.email` is the recipient (required on every send).
- Every other field is data for the email. The design reads it as
  `{{ trigger.confirmationUrl }}` and so on. Nested objects and arrays are
  fine (JSON only, up to 64 KiB). A field set to `undefined` is left out of
  the body, so an optional value such as `userName` can come straight from
  app state.
- The key resolves inside the brand the API key acts for. An
  organization-scoped key names the brand: `brew.withBrand(brandId).send(…)`.

Each key needs a trigger with that `key` and a published automation that
sends the email. To wire one, create a trigger with a `key`
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
| Typical use        | auth and lifecycle emails from your code           | campaigns and test sends                            |

## Response

`brew.send` resolves to the accepted fire, the same body as
`automations.triggers.fire` plus `triggerKey`:

```ts
const result = await brew.send('lifecycle.welcome', {
  email: 'kim@example.com',
  userName: 'Kim',
})
result.triggerKey // 'lifecycle.welcome', on every by-key response
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
| 422    | `DOMAIN_REQUIRED`         | Sandbox sender: the recipient is not in your organization.  |
| 409    | `IDEMPOTENCY_CONFLICT`    | The idempotency key was reused with a different payload.    |
| 429    | `RATE_LIMITED`            | Retried for you up to `maxRetries`, honoring `Retry-After`. |
| 429    | `SANDBOX_DAILY_LIMIT`     | Today's sandbox sends are used up; see `details.resetsAt`.  |

```ts
import { BrewApiError } from '@brew.new/sdk'

try {
  await brew.send('auth.magic-link', { email, confirmationUrl })
} catch (error) {
  if (error instanceof BrewApiError && error.code === 'TRIGGER_KEY_NOT_FOUND') {
    // no trigger in this brand has the key yet: set `key` on one
  }
  throw error
}
```

## Typed keys and payloads

`brew.send` accepts any string key and an `{ email, …JSON }` payload (any
field but `email` may be `undefined`) until you declare your keys. Augment
`BrewTriggerKeyRegistry` once and every call site is checked: an unknown
key or a wrong payload stops compiling.

```ts
// brew-keys.d.ts (any .d.ts or .ts file your tsconfig includes)
import '@brew.new/sdk'

declare module '@brew.new/sdk' {
  interface BrewTriggerKeyRegistry {
    'auth.password-reset': {
      email: string
      appName?: string
      userName?: string
      confirmationUrl?: string
      expiresInMinutes?: number
    }
    // A key of your own:
    'order.paid': { email: string; orderId: string; total: number }
  }
}
```

```ts
await brew.send('order.paid', { email, orderId, total: 42 }) // ok
await brew.send('order.payed', { email }) // error: not a registered key
await brew.send('order.paid', { email, orderId }) // error: `total` missing
```

A key typed as a union (`'auth.password-reset' | 'order.paid'`) could be
either key at runtime, so its payload must fit every key in the union. A
key whose registered payload is itself a union is satisfied by any one of
its alternatives.
Narrow the key first to send one key's payload.

`BrewSendKey`, `BrewSendPayload<K>` and `BrewSendPayloadFor<K>` (the payload
a call with key type `K` must carry) expose the same types for your own
helpers.

## Starter-kit keys

Brew's app email starter kit uses these keys. The auth emails share one
payload: `email` (required) and the optional `appName`, `userName`,
`confirmationUrl`, `otp`, `expiresInMinutes`, `newEmail`, `inviterName`,
`organizationName` and `noticeType`, each sent when that email needs it.
The lifecycle emails take `email`, optional `userName` and `appName`, and
fields of their own.

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
