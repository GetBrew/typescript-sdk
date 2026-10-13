# @brew.new/sdk

Official TypeScript SDK for the [Brew](https://brew.new) public API.

- Resource-oriented surface — `brew.contacts.upsert(...)` instead of raw HTTP plumbing.
- One typed error class (`BrewApiError`) for every non-2xx path, and typed
  transport errors (`BrewTimeoutError`, `BrewConnectionError`) when no
  answer arrives.
- A deadline (`timeoutMs`) and cancellation (`signal`) that cover the whole
  request, response body included.
- Safe retries with exponential backoff + jitter.
- Auto-generated `Idempotency-Key` on POST so retries never double-write.
- Node 20+ for the server API client. API keys stay on your backend; browser
  canvas integrations use the separate `@brew.new/sdk/react` or `/embed` entry.

## Install

```bash
bun add @brew.new/sdk
# or
npm install @brew.new/sdk
```

## Send your first app email

```ts
import { createBrewClient } from '@brew.new/sdk'

const brew = createBrewClient({ apiKey: process.env.BREW_API_KEY! })

await brew.send('auth.password-reset', {
  email: 'jane@example.com',
  confirmationUrl: 'https://app.example.com/reset?token=abc',
  appName: 'Acme',
})
```

`brew.send(key, payload)` sends the app email behind a trigger key: the
key's published automation holds the design, the subject and the sender,
and `payload` carries the recipient (`email`) plus the data the email reads
(`{{ trigger.confirmationUrl }}`). A key is a trigger in your brand with
that `key` set: the auth emails (`auth.verify-email`, `auth.magic-link`,
`auth.otp`, `auth.password-reset`, …), lifecycle emails such as
`lifecycle.welcome`, or a key of your own. The auth emails share one
payload: `email` plus optional `appName`, `userName`, `confirmationUrl`,
`otp` and the rest listed in [`docs/send.md`](./docs/send.md#starter-kit-keys).
Pass `{ idempotencyKey }` as the third argument when the call itself can
repeat, and augment `BrewTriggerKeyRegistry` to type-check every key and
payload. See [`docs/send.md`](./docs/send.md).

`brew.send` is not `brew.emails.send`: `emails.send` sends a saved design to
an audience (a campaign) or as one test delivery.

## Set up app emails in one call

A key needs a trigger, a design and a published automation before
`brew.send` can use it. `brew.appEmails` sets all of that up in one
idempotent call:

```ts
// The auth + lifecycle starter kit, narrowed to the keys Better Auth sends:
const { results, stack } = await brew.appEmails.setUpKit({
  stack: 'better-auth',
})

// One key of your own, from your own React Email (or HTML, MJML) source:
await brew.appEmails.upsert({
  triggerKey: 'order.shipped',
  source: { format: 'jsx', content: orderShippedJsx },
  subject: 'Your order shipped',
})

// What is set up, and whether each key sends now:
const { data } = await brew.appEmails.list()
const reset = await brew.appEmails.get('auth.password-reset')
reset.readiness // { ready, teamOnly, blockers }
```

Run it again any time: a re-run changes only what differs, and a design
someone edited in Brew is kept (`409 APP_EMAIL_EDITED_IN_BREW`) until you
pass `overwrite: true`. Until a sending domain verifies, app emails send
from a team-only sandbox (members of your organization, under a daily
cap). The setup calls need the `automations` and `emails` scopes and
default to a 5-minute timeout. They ship with Brew platform release
GetBrew/brew-v2#2066. See [`docs/app-emails.md`](./docs/app-emails.md).

## Adapters

Subpath exports that wire `brew.send` into the libraries apps already use.
No extra install and no peer dependencies; each works on Node 20+, and
`/supabase` on Deno and edge runtimes.

| Import                                             | For                                                                        | Guide                                                            |
| -------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `@brew.new/sdk/resend`                             | Resend-shaped `emails.send({ template })` and `batch.send`; never throws   | [`docs/adapters/resend.md`](./docs/adapters/resend.md)           |
| `@brew.new/sdk/better-auth`                        | Better Auth email callbacks (verify, reset, change email, magic link, OTP) | [`docs/adapters/better-auth.md`](./docs/adapters/better-auth.md) |
| `@brew.new/sdk/next-auth`, `@brew.new/sdk/auth-js` | Auth.js email provider (`BrewEmail`), v4 and v5                            | [`docs/adapters/auth-js.md`](./docs/adapters/auth-js.md)         |
| `@brew.new/sdk/supabase`                           | Supabase Auth Send Email Hook for Edge Functions, Standard Webhooks verify | [`docs/adapters/supabase.md`](./docs/adapters/supabase.md)       |

```ts
import { Resend } from '@brew.new/sdk/resend'

const resend = new Resend() // reads BREW_API_KEY
const { data, error } = await resend.emails.send({
  to: 'jane@example.com',
  template: { id: 'auth.password-reset', variables: { confirmationUrl } },
})
```

## Quick start

```ts
import { createBrewClient } from '@brew.new/sdk'

const brew = createBrewClient({
  apiKey: process.env.BREW_API_KEY!,
})

const contact = await brew.contacts.upsert({
  email: 'jane@example.com',
  firstName: 'Jane',
  customFields: { plan: 'enterprise' },
})

const found = await brew.contacts.get('jane@example.com')

const { data } = await brew.contacts.search({
  filters: [
    { field: 'customFields.plan', operator: 'equals', value: 'enterprise' },
  ],
})
```

That's the whole shape. Every other method follows the same pattern:
`list(query)` for a page, `get(id)` for the bare row, and a `404` — not
an empty page — when the id is unknown.

> **Upgrading from 10.x?** 11.0.0 turns `emails.previewClients` into a
> rendering job you poll with `emails.getClientPreview`, and drops the
> deprecated `verificationStatus` mirror on contacts. **From 9.x?** 10.0.0
> tracks the public API v1 cleanup. Read the [CHANGELOG](./CHANGELOG.md) for
> both migrations.

## Images: upload, add, delete

The brand image library is what the email agent searches when it designs.
Adding and deleting images is free.

```ts
import { openAsBlob } from 'node:fs'

// A local file, in one call: opens an upload, sends the bytes, adds it.
const logo = await brew.content.uploadImage({
  file: await openAsBlob('./assets/logo.png'), // or a Buffer / ArrayBuffer
  fileName: 'logo.png', // contentType inferred from the extension
})
// → { url: 'https://cdn.brew.new/…', width, height, aspectRatio, assetId }

// A public URL (or up to 100 with `imageUrls`, imported in the background).
const hero = await brew.content.addImage({
  imageUrl: 'https://acme.com/hero.jpg',
})

// Remove one from the library. Emails already using it keep rendering.
await brew.brand.deleteImage(hero.assetId) // → { assetId, deleted: true }
```

`uploadImage` takes a `Blob`/`File`, an `ArrayBuffer` or a `Uint8Array`
up to 20 MB (2 MB for SVG) as PNG, JPEG, GIF, WebP, AVIF, TIFF or SVG.
Pass `contentType` when the file name has no such extension. An empty
file, or one over those limits, throws a `TypeError` before any request.
The bytes go straight to the upload's own URL without your API key, and
that step is retried like any other (a repeat never replaces the first
file). Opening the upload is not retried by default, because the API never
replays it and each retry would hold one of the brand's 20 upload slots
for 15 minutes; if it fails, call `uploadImage` again. To drive the steps
yourself, call `brew.content.createImageUpload({ fileName, contentType,
size })`, POST the raw bytes to its `uploadUrl` within 15 minutes, then
`brew.content.addImage({ uploadId })`.

## Pointing at a different environment

`baseUrl` is configurable. By default it points at production
(`https://brew.new/api`), but you can override it for staging, local
development, or a custom proxy:

```ts
const brew = createBrewClient({
  apiKey: process.env.BREW_API_KEY!,
  baseUrl: process.env.BREW_API_URL ?? 'https://brew.new/api',
})
```

Common values:

- `https://brew.new/api` — production (default)
- `https://staging.brew.new/api` — staging
- `http://localhost:3000/api` — your own dev server

Trailing slashes are normalized either way. See
[`docs/configuration.md`](./docs/configuration.md) for the full list of
config options (`timeoutMs`, `maxRetries`, `retryOnTimeout`, `signal`,
`userAgent`, custom `fetch`, etc.).

## Documentation

Embed a group or single email in your app with [`EmailCanvas`](docs/embed.md),
the React component from `@brew.new/sdk/react`, using a publishable `clientId` and exactly one `groupId` or `emailId`. No Clerk keys or browser API keys are required. A plain JavaScript iframe
controller is available from `@brew.new/sdk/embed`.

| Topic                              | File                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------- |
| `brew.send` (app email by key)     | [`docs/send.md`](./docs/send.md)                                       |
| App emails (set up by key)         | [`docs/app-emails.md`](./docs/app-emails.md)                           |
| Resend adapter                     | [`docs/adapters/resend.md`](./docs/adapters/resend.md)                 |
| Better Auth adapter                | [`docs/adapters/better-auth.md`](./docs/adapters/better-auth.md)       |
| Auth.js (next-auth) adapter        | [`docs/adapters/auth-js.md`](./docs/adapters/auth-js.md)               |
| Supabase Send Email Hook           | [`docs/adapters/supabase.md`](./docs/adapters/supabase.md)             |
| Analytics resource                 | [`docs/analytics.md`](./docs/analytics.md)                             |
| Automations resource               | [`docs/automations.md`](./docs/automations.md)                         |
| Audiences resource                 | [`docs/audiences.md`](./docs/audiences.md)                             |
| Brand resource                     | [`docs/brand.md`](./docs/brand.md)                                     |
| Brands (lifecycle)                 | [`docs/brands.md`](./docs/brands.md)                                   |
| Chats resource                     | [`docs/chats.md`](./docs/chats.md)                                     |
| Client configuration               | [`docs/configuration.md`](./docs/configuration.md)                     |
| Contacts resource                  | [`docs/contacts.md`](./docs/contacts.md)                               |
| Domains resource                   | [`docs/domains.md`](./docs/domains.md)                                 |
| Emails resource (+ send)           | [`docs/emails.md`](./docs/emails.md)                                   |
| Fields resource                    | [`docs/fields.md`](./docs/fields.md)                                   |
| Insights resource                  | [`docs/insights.md`](./docs/insights.md)                               |
| Notifications resource             | [`docs/notifications.md`](./docs/notifications.md)                     |
| Error handling                     | [`docs/errors.md`](./docs/errors.md)                                   |
| Retries + idempotency              | [`docs/retries-and-idempotency.md`](./docs/retries-and-idempotency.md) |
| Sends resource (reads + lifecycle) | [`docs/sends.md`](./docs/sends.md)                                     |
| Templates resource                 | [`docs/templates.md`](./docs/templates.md)                             |
| Flows resource                     | [`docs/flows.md`](./docs/flows.md)                                     |
| Development + OpenAPI sync         | [`docs/development.md`](./docs/development.md)                         |
| **Releasing a new version**        | [`RELEASING.md`](./RELEASING.md)                                       |

> Note: `brew.brand.*` (singular) reads the brand the CURRENT request acts on
> — its design system, identity, and extraction readiness. `brew.brands.*`
> (plural) is the organization-level lifecycle: list, create, and poll brands.
>
> An API key is scoped either to ONE BRAND or to the whole ORGANIZATION. A
> brand-scoped key resolves its brand automatically. An organization-scoped key
> must name one per request — pass `brandId` in the client config, or pin one
> with `client.withBrand(id)`. There is no default brand: omitting it returns
> `400 BRAND_ID_REQUIRED`.
>
> ```ts
> const brew = createBrewClient({ apiKey: process.env.BREW_API_KEY! })
> const { data: brands } = await brew.brands.list()
> const acme = brew.withBrand(brands[0].brandId)
> await acme.emails.list()
> ```

## Development

Use a modern Node 20 or newer runtime for SDK development. On this
machine, Vitest worked with Node `20.19.2` and newer, but failed on the
older system Node `20.10.0`.

```bash
bun install
bun tsc         # typecheck
bun lint        # eslint
bun run format  # prettier
bun run test    # vitest — NOT `bun test`, that hits Bun's built-in runner and bypasses MSW setup
bun run build   # tsup: dist/ with esm + cjs + .d.ts
```

Full contribution + testing conventions live in [`AGENTS.md`](./AGENTS.md).
The big one: every change is driven red → green via vitest + MSW, no
exceptions for "trivial" pure functions.

## License

MIT
