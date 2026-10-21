# Integrations

`brew.integrations` reads the brand's integration catalog and connects the
hosted auth email hooks: auth providers that hand your app's auth emails
(sign-up confirmation, magic link, password reset, …) to Brew, which sends
them as [app emails](./app-emails.md).

```ts
import { createBrewClient } from '@brew.new/sdk'

const brew = createBrewClient({ apiKey: process.env.BREW_API_KEY! })

const connection = await brew.integrations.connect({
  provider: 'supabase_auth',
  signingSecret: process.env.SUPABASE_SEND_EMAIL_HOOK_SECRET!, // v1,whsec_…
})

connection.webhookUrl // paste it into Supabase as the Send Email hook URL
connection.status // 'pending_verification' until the first signed delivery
connection.authEmails // [{ triggerKey: 'auth.verify-email', ok: true }, …]
```

| Call                                                                          | HTTP                                         | Scopes                   |
| ----------------------------------------------------------------------------- | -------------------------------------------- | ------------------------ |
| `brew.integrations.list(options?)`                                            | `GET /v1/integrations`                       | none                     |
| `brew.integrations.connect({ provider, signingSecret, settings? }, options?)` | `PUT /v1/integrations/{provider}/connection` | `emails` + `automations` |
| `brew.integrations.getConnection(provider, options?)`                         | `GET /v1/integrations/{provider}/connection` | none                     |

All three are brand-scoped (`X-Brand-Id` on an organization key: pass
`brandId` or use `brew.withBrand(id)`). Every method takes `{ raw: true }`
in `options` for `{ data, status, headers, requestId }`.

> **Availability.** The connection routes ship in the Brew platform release
> that deploys GetBrew/brew-v2#2169. SDK 13.3.0 is not released before that
> deploy: until then `connect` and `getConnection` answer `404`.

## `list`: the catalog

`list()` returns `{ data, pagination }`, one row per provider with `provider`, `name`,
`category` (`data_in` or `data_out`), `connected` and, for providers not yet
live, `comingSoon`. Connecting a catalog provider is a Settings step in
Brew at `/integrations/{provider}`; only the hosted auth hooks below
connect over the API.

## `connect`: a hosted auth hook

| `provider`      | `signingSecret`                                                                 | Where `webhookUrl` goes                         |
| --------------- | ------------------------------------------------------------------------------- | ----------------------------------------------- |
| `supabase_auth` | Supabase, Authentication > Hooks > Send Email (HTTPS): the secret, `v1,whsec_…` | The hook URL                                    |
| `clerk`         | Clerk, Webhooks > your endpoint: the signing secret, `whsec_…`                  | The endpoint URL, subscribed to `email.created` |

One call stores the secret, returns the connection and sets up the auth app
emails that provider sends, from the starter kit, as
[`appEmails.setUpKit`](./app-emails.md) does for `stack: 'supabase'` or
`stack: 'clerk'`. `authEmails` has one row per key: `ok: true`, or
`ok: false` with its `error` (`code`, `message`). A failed key does not
throw; connecting again finishes it.

For Clerk, also turn off Delivered by Clerk for exactly the templates Brew
sends (`stack.note` from `appEmails.setUpKit({ stack: 'clerk' })` lists
them). Until a template is off, Clerk sends it and Brew sends nothing.

`settings.projectUrl` (Supabase only) is the URL the confirmation links
point at: `https://<ref>.supabase.co` or a custom auth domain. Omitted, the
links use the URL Supabase sends with each email.

Run it again any time: the `connectionId` and `webhookUrl` never change
for a brand and provider, a new secret replaces the old one, and an app
email someone edited in Brew is kept. The call is a `PUT`, so it carries no
`Idempotency-Key` and the SDK retries it like any idempotent request. It
defaults to a 5-minute timeout (`CONNECT_INTEGRATION_DEFAULT_TIMEOUT_MS`),
since the kit imports a design per key.

**The signing secret.** The SDK sends `signingSecret` in the request body
only. It is never logged, never put in a URL or header, and never part of
a returned value or a thrown error; `getConnection` never returns it. Keep
it out of model prompts too: the connect route is HTTP only, not an MCP
tool.

**Errors** (`BrewApiError`): `400 INVALID_REQUEST` for a secret in the
wrong format, a provider the API does not connect or a `projectUrl` that
is not https; `403 INSUFFICIENT_PERMISSIONS` for a key without both
scopes. An empty provider, `.` or `..` throws `TypeError` before any
request.

## `getConnection`

```ts
const { connectionId, webhookUrl, status } =
  await brew.integrations.getConnection('supabase_auth')
```

`status` is `pending_verification` until the provider's first signed
delivery arrives, then `active`. A provider not connected for the brand is
`404 NOT_FOUND`.

## Hosted or self-hosted (Supabase)

Two ways to send Supabase Auth's emails with Brew:

- **Hosted**: `connect({ provider: 'supabase_auth', … })` and point the
  Send Email hook at the returned `webhookUrl`. Brew verifies each
  delivery, picks the starter-kit key for the email type and sends it.
  Nothing to deploy.
- **Self-hosted**: deploy
  [`createSupabaseSendEmailHook`](./adapters/supabase.md) from
  `@brew.new/sdk/supabase` as a Supabase Edge Function and point the hook
  at it. Use it to rename keys, build your own confirmation links or send
  codes in link emails.

Supabase runs one Send Email hook per project, so pick one of the two.
