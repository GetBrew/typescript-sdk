# Integrations

`brew.integrations` reads the brand's integration catalog and live source events, and connects the
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

These methods are brand-scoped (`X-Brand-Id` on an organization key: pass
`brandId` or use `brew.withBrand(id)`). Every method takes `{ raw: true }`
in `options` for `{ data, status, headers, requestId }`.

> **Availability.** The connection routes ship in the Brew platform release
> that deploys GetBrew/brew-v2#2169. SDK 13.7.0 is not released before that
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
them), after verifying that it is the same instance whose current signed
webhook Brew received. The optional `verifiedInstanceId` in a connection
response identifies that instance; compare it with the instance selected by
your Clerk Backend API key before automating a delivery change. Missing
proof is not evidence that two instances match. Until a template is off,
Clerk sends it and Brew sends nothing.

`settings.projectUrl` (Supabase only) is the URL the confirmation links
point at: `https://<ref>.supabase.co` or a custom auth domain. Omitted, the
links use the URL Supabase sends with each email.

Run it again any time: the `connectionId` and `webhookUrl` never change
for a brand and provider, a new secret replaces the old one, and an app
email someone edited in Brew is kept. An auth app email unpublished in
Brew stays off, so the provider's email for that key is refused until it
is published again. The response carries no warning for it (its row is
still `ok: true`): check `published` with `brew.appEmails.list()`. To turn
it back on, publish it in Brew, or repeat its setup with `publish: true`
([`brew.appEmails.upsert`](./app-emails.md) with the same input; a bare
`publish: true` re-plans the key from the kit's starter, replacing a
design built from a `source`). The call is a `PUT`, so it carries no
`Idempotency-Key` and the SDK retries it like any idempotent request. It
defaults to a 5-minute timeout (`CONNECT_INTEGRATION_DEFAULT_TIMEOUT_MS`),
since the kit imports a design per key.

For initial setup spanning Brew and the provider, pass `createOnly: true`.
It accepts an unchanged existing secret and settings, but refuses a
different existing connection with `409 INTEGRATION_ALREADY_CONNECTED`.
Persist the generated secret securely before the call so an interrupted
setup can retry with the same credential. Omitting this option keeps the
explicit secret-rotation behavior above.

**The signing secret.** The SDK sends `signingSecret` in the request body
only. It is never logged, never put in a URL or header, and never part of
a returned value or a thrown error; `getConnection` never returns it. Keep
it out of model prompts too: the connect route is HTTP only, not an MCP
tool.

**Errors** (`BrewApiError`): `400 INVALID_REQUEST` for a secret in the
wrong format, a provider the API does not connect or a `projectUrl` that
is not https; `403 INSUFFICIENT_PERMISSIONS` for a key without both
scopes; `409 INTEGRATION_CONNECTED_IN_APP` when Clerk was connected on its
integration page in Brew with another signing secret (the API never
replaces that connection: rotate the secret on the integration page, or
send the one it already has, which answers the connection as it is). An empty provider, `.` or `..` throws `TypeError` before any
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

## Live integration events

A live source sends Brew its own events: a PostHog project's events, or the
Stripe and Shopify app catalogs. Each event can start an automation. Find
one with `events.list`, read what it carries with `events.get`, then get its
trigger with
[`automations.triggers.ensureIntegrationEvent`](./automations.md#integration-event-triggers).

### List events

```ts
const page = await brew.integrations.events.list({
  provider: 'posthog', // optional
  query: 'project', // optional: searches names, titles and categories
  kind: 'custom', // optional: standard | custom | action | derived | observed
  limit: 50, // 1–100, default 100
})

for (const event of page.data) {
  console.log(event.eventId, event.eventKey, event.label, event.volume30d)
}
// page.sources: the connected sources the page drew from
// page.pagination: { limit, cursor, hasMore }
```

Each `IntegrationEvent` has its `eventId`, the provider's `eventKey`, Brew's
`label` and lifecycle `stage`, its `modelRoles` (`signup`, `activation`,
`conversion`, `key_event`), `volume30d`, and its `triggerEventId` once it is
a trigger. Without `query`, each source's busiest events come first.

Events a brand member hid, and internal traffic Brew suppressed, are left
out, so a page can hold fewer than `limit` rows. Follow `pagination.cursor`
until `hasMore` is `false` to read every event.

### Read one event

```ts
const event = await brew.integrations.events.get(
  'k5714pq3vm8x2n6c9d0b7f1h4j6g2r8t'
)

for (const property of event.properties) {
  // e.g. 'properties.project_name' or 'person.first_name'
  console.log(property.variable, property.isPersonal)
}
```

Each property has its template `variable` (use it as
`{{ <variable> | fallback }}`), its `scope` (`event` or `person`), `type`,
`isPersonal` (personal data: never put it in a subject) and
`isPersonalization` (Brew suggests it to personalize an email).

The read may call the provider: an event listed bare, or described more than
a day ago, is described there first, on the account's read budget.
`event.propertiesStatus` (`IntegrationEventPropertiesStatus`) says how
current `properties` are:

| `propertiesStatus` | `properties`                                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `current`          | Listed with the event, or read in the last day.                                                                  |
| `stored`           | The provider could not be read now: its last description.                                                        |
| `rate_limited`     | The read budget is spent: what Brew stored, possibly none. Read again after `retryAfterSeconds`, when it is set. |
| `unavailable`      | Not read, and none stored.                                                                                       |

A spent budget is not an error: `get` resolves with what Brew stored.

```ts
if (event.propertiesStatus === 'rate_limited') {
  // event.retryAfterSeconds: seconds until the provider can be read again
}
```

Pass an `eventId` from `events.list`; never compose one. An unknown or
other-brand id throws a `BrewApiError` with `status: 404` and
`code: 'INTEGRATION_EVENT_NOT_FOUND'`.
