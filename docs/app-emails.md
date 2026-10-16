# App emails

Set up the emails your code sends by trigger key (a password reset, a
magic link, a welcome email), then send them with
[`brew.send`](./send.md). One call creates the trigger with that key, its
payload contract, the design, and an automation that sends it, and
publishes it:

```ts
import { createBrewClient } from '@brew.new/sdk'

const brew = createBrewClient({ apiKey: process.env.BREW_API_KEY! })

// The auth and lifecycle starter kit, narrowed to what Better Auth sends:
const kit = await brew.appEmails.setUpKit({ stack: 'better-auth' })

// One key of your own, from your own React Email source:
await brew.appEmails.upsert({
  triggerKey: 'order.shipped',
  source: { format: 'jsx', content: orderShippedJsx },
  subject: 'Your order shipped',
  payloadSchema: {
    fields: [{ key: 'orderId', type: 'string', required: true }],
  },
})

await brew.send('order.shipped', {
  email: 'kim@example.com',
  orderId: 'A-1042',
})
```

| Call                                                       | HTTP                              | Scopes                   |
| ---------------------------------------------------------- | --------------------------------- | ------------------------ |
| `brew.appEmails.list(input?, options?)`                    | `GET /v1/app-emails`              | `automations`            |
| `brew.appEmails.get(triggerKey, options?)`                 | `GET /v1/app-emails/{triggerKey}` | `automations`            |
| `brew.appEmails.upsert({ triggerKey, ...body }, options?)` | `PUT /v1/app-emails/{triggerKey}` | `automations` + `emails` |
| `brew.appEmails.setUpKit(input?, options?)`                | `POST /v1/app-emails/kit`         | `automations` + `emails` |

A setup imports a design, so `upsert` and `setUpKit` also need the
`emails` scope and share the email import's rate budget. Every method takes
`{ raw: true }` in `options` for `{ data, status, headers, requestId }`.

> **Availability.** These routes ship in the Brew platform release that
> deploys GetBrew/brew-v2#2066. SDK 13.2.0 is not released before that
> deploy: until then each route answers `404`.

## `upsert`: one key

`upsert` is idempotent: run it on every deploy or from a setup script.

```ts
const result = await brew.appEmails.upsert({
  triggerKey: 'auth.password-reset',
})

result.created // { trigger: true, email: true, automation: true } on the first run
result.published // true: a fire by this key starts the automation
result.sender // { mode: 'sandbox', from, sandbox: { dailyLimit, remainingToday } }
result.payloadSchema // the stored contract: { type: 'object', fields }
result.fireExample.sdk // the `brew.send(...)` line for this key
result.warnings // e.g. SANDBOX_SENDER, APP_EMAIL_NOT_PUBLISHED
```

The design comes from one of:

- **A starter-kit key alone.** `auth.password-reset`, `lifecycle.welcome`
  and the rest of the kit (listed in [`send.md`](./send.md#starter-kit-keys))
  default to their own starter, so `{ triggerKey }` is the whole call.
- **`starter`.** Any kit template on a key of your own. On a kit key it
  must equal the key.
- **`source`.** Your own `{ format: 'html' | 'mjml' | 'jsx', content }`.
  Merge tags such as `{{ trigger.orderId }}` read the payload.

Pass at most one of `starter` and `source`. The other fields:

| Field           | Default                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------ |
| `payloadSchema` | The starter's contract, or for a `source` the fields its `{{ trigger.<field> }}` tags read |
| `title`         | The trigger's current title, else the kit key's, else one derived from the key             |
| `subject`       | The starter's subject, else the title                                                      |
| `previewText`   | The starter's                                                                              |
| `domainId`      | A verified domain whose purpose matches the email, else the team-only sandbox              |
| `from`          | `{ localPart, name }` on the sending domain                                                |
| `publish`       | `true`                                                                                     |
| `overwrite`     | `false`: keep a design edited in Brew                                                      |

`payloadSchema.fields` are flat (`string`, `int`, `boolean`, `date`) and
can mark `pii: 'high'` to keep a value out of logs. Mark a one-time code or
sign-in link `secret: true`: Brew uses it only to render the email and
redacts it wherever the fire is stored, logged or counted. `email` never
takes it. A field without the marker counts `pii: 'high'` as secret, and a
field the starter kit marks secret (`otp`, `confirmationUrl`, `newEmail`)
stays secret. `email` (the recipient) is added when missing. Only `email`
reaches the contact; every other field is template data.

```ts
await brew.appEmails.upsert({
  triggerKey: 'account.sign-in-code',
  source: { format: 'jsx', content: signInCodeJsx },
  payloadSchema: {
    fields: [
      {
        key: 'code',
        type: 'string',
        required: true,
        pii: 'high',
        secret: true,
      },
    ],
  },
})
```

**Re-runs** change only what differs. The same starter version, or the
same source, keeps the design. A newer starter version, another starter or
another source replaces it, unless someone edited the design in Brew since
setup: then the call throws `409 APP_EMAIL_EDITED_IN_BREW` until you pass
`overwrite: true`. A deleted design or automation is created again. A
sandbox sender moves to a matching domain once one verifies.

The first setup of a key answers HTTP `201`; a re-run answers `200`. Read
the status with `{ raw: true }`, or read `created`.

**Sandbox sender.** Until a domain verifies, an app email sends from the
Brew sandbox to members of your organization only, under a daily cap
(`sender.sandbox.dailyLimit` and `remainingToday`), and `readiness.teamOnly`
is `true`. Verify a domain (`brew.domains.add`, `brew.domains.verify`),
then run the setup again: the sender moves to the matching domain.

## `setUpKit`: the starter kit

```ts
const { results, stack } = await brew.appEmails.setUpKit({
  sets: ['auth', 'lifecycle'], // default: both
  stack: 'supabase', // default: 'custom' (every auth key)
})

for (const result of results) {
  if (!result.ok) console.warn(result.triggerKey, result.error.code)
}
stack.authDelivery // 'code' for every stack today
stack.snippets // [{ title, file, code }] for your auth library
```

- `sets`: `auth` (verify email, magic link, one-time code, password reset,
  invite, email change, reauthentication, security notice) and
  `lifecycle` (welcome, trial ending, payment failed, win-back).
- `stack`: `better-auth`, `authjs`, `supabase`, `clerk`, `firebase` or
  `custom`. It narrows the auth keys to the ones that library sends and
  picks the code snippets. Supabase gets a Send Email Hook to deploy as a
  Supabase Edge Function ([`@brew.new/sdk/supabase`](./adapters/supabase.md))
  that sends every auth email with Brew. Clerk keeps sending its own auth
  emails, so a `clerk` run sets up the lifecycle emails only. Every stack
  answers `authDelivery: 'code'`; `'hosted-webhook'` is reserved for a
  provider that hands its auth emails to Brew directly, which none does
  yet.
- `keys`: exactly these kit keys, instead of `sets` and `stack`.
- `domainId`, `overwrite`: applied to every key, as in `upsert`.

Each key is set up exactly as `upsert` sets it up, a few at a time.
`results` come back in kit order; one key failing (`ok: false` with its
`error`) does not stop the others and does not throw. Run the kit again to
finish the failed ones. Only a refusal of the whole call throws.

The SDK attaches an `Idempotency-Key` to the kit call, so its own retries
replay instead of running twice; pass `{ idempotencyKey }` to make your own
retries replay too.

## `list` and `get`

```ts
const { data, pagination } = await brew.appEmails.list({ limit: 50 })

const reset = await brew.appEmails.get('auth.password-reset')
reset.readiness // { ready: true, teamOnly: true, blockers: [] }
reset.upgradeAvailable // a newer starter version exists: run upsert again
reset.sender // { mode: 'domain' | 'sandbox' | 'none', domainId?, domainStatus? }
```

`readiness.ready` says a fire by this key sends now. When it is `false`,
`blockers` names why: `AUTOMATION_MISSING`, `AUTOMATION_NOT_PUBLISHED` or
`DOMAIN_REQUIRED`. Page with `limit` (1 to 100) and the previous page's
`pagination.cursor`.

## Timeouts and retries

A setup creates several records and imports a design, so `upsert` and
`setUpKit` default to a 5-minute per-attempt deadline
(`UPSERT_APP_EMAIL_DEFAULT_TIMEOUT_MS`,
`SET_UP_APP_EMAIL_KIT_DEFAULT_TIMEOUT_MS`, both `300_000`). A per-call
`timeoutMs` still wins, and a longer client-wide `timeoutMs` is kept.

`upsert` is a `PUT`: it carries no `Idempotency-Key`, and a retry after a
`5xx` or a timeout runs the same setup again, which converges on the same
result. If the first attempt is still running, the retry can answer
`409 TRIGGER_KEY_TAKEN`; run it again once the first finishes.

## Errors

A refused call throws `BrewApiError` (see [`errors.md`](./errors.md)):

| Status | `code`                      | Meaning                                                           |
| ------ | --------------------------- | ----------------------------------------------------------------- |
| 404    | `TRIGGER_KEY_NOT_FOUND`     | `get`: no app email is set up for the key in this brand.          |
| 409    | `APP_EMAIL_EDITED_IN_BREW`  | `upsert`: the design was edited in Brew; pass `overwrite: true`.  |
| 400    | `APP_EMAIL_STARTER_UNKNOWN` | `upsert`: `starter` names no kit template (or another kit key's). |
| 400    | `TRIGGER_KEY_RESERVED`      | `upsert`: `kit`, `by-key`, `brew.*` or a non-kit `auth.*` key.    |
| 404    | `DOMAIN_NOT_FOUND`          | `upsert`: `domainId` is not a domain in this brand.               |
| 409    | `TRIGGER_KEY_TAKEN`         | `upsert`: another setup of the key won a race; run it again.      |
| 409    | `TRIGGER_LIMIT_REACHED`     | `upsert`: the brand holds the maximum number of triggers.         |
| 422    | `EMAIL_IMPORT_FAILED`       | `upsert`: the `source` could not be imported as an email.         |
| 413    | `PAYLOAD_TOO_LARGE`         | `upsert`: the `source` exceeds the route cap.                     |

```ts
import { BrewApiError } from '@brew.new/sdk'

try {
  await brew.appEmails.upsert({ triggerKey: 'lifecycle.welcome' })
} catch (error) {
  if (
    error instanceof BrewApiError &&
    error.code === 'APP_EMAIL_EDITED_IN_BREW'
  ) {
    // someone edited the welcome email in Brew: keep it, or pass overwrite: true
  }
  throw error
}
```

An empty key, `.` or `..` throws a `TypeError` before any request. Any
other key is percent-encoded into the path and checked by the API (keys are
lowercase letters, digits, `.`, `_` and `-`, up to 64 characters).

## Types

`AppEmail` (a row), `AppEmailsListResponse`, `AppEmailSetupResult`,
`UpsertAppEmailInput`, `SetUpAppEmailKitInput`, `AppEmailKitResponse`,
`AppEmailKitResult` (narrow on `ok`), `AppEmailKitStack`, `AppEmailKitKey`,
`AppEmailKitSet` and `AppEmailKitStackProvider` are exported from
`@brew.new/sdk`.
