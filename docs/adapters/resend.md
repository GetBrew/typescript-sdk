# `@brew.new/sdk/resend`

A Resend-shaped client for template sends. A Resend call site that sends a
template moves to Brew by changing its import and its key:

```ts
// Before
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

// After
import { Resend } from '@brew.new/sdk/resend'
const resend = new Resend(process.env.BREW_API_KEY, {
  templates: { 'password-reset': 'auth.password-reset' },
})

const { data, error } = await resend.emails.send({
  from: 'Acme <hi@acme.dev>', // ignored: the automation's send step holds the sender
  to: user.email,
  template: {
    id: 'password-reset',
    variables: { confirmationUrl, userName: user.name },
  },
})
if (error) {
  console.error(error.name, error.message) // for example 'not_found'
}
```

Each send is `brew.send(templates[id] ?? id, { ...variables, email: to })`
(see [`docs/send.md`](../send.md)): the template id is the Brew trigger key,
or a Resend id you map to one in `templates`. The design, the subject and
the sender live on the key's published automation in Brew.

## Options

`new Resend(apiKey?, options?)`. `apiKey` defaults to
`process.env.BREW_API_KEY`. Without a key the constructor still returns a
client, and every send answers `missing_api_key`.

| Option      | Default                | What it does                                                                                                        |
| ----------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `baseUrl`   | `https://brew.new/api` | The Brew API base URL.                                                                                              |
| `brandId`   | none                   | The brand to send from, for an organization-scoped API key.                                                         |
| `templates` | `{}`                   | Resend template id to Brew trigger key. An id that is not mapped is used as the key.                                |
| `onWarning` | `console.warn`         | Told once per client about fields Brew ignores (`from`, `subject`, `replyTo`, `tags`, `topicId`).                   |
| `client`    | built from the key     | A `createBrewClient(...)` client to send through instead, sharing its retries, timeouts and `withBrand(...)` scope. |

## `emails.send(email, { idempotencyKey? })`

Answers Resend's `{ data, error, headers }` and never throws: every
failure, including a dropped connection, comes back as `error`.

- `data.id` is the Brew trigger instance id
  (`brew.automations.triggerInstances.get(id)`).
- `to` takes one recipient: `'jane@example.com'`, `'Jane <jane@example.com>'`
  or a one-element array. `variables.email` never overrides it.
- `idempotencyKey` is sent as Brew's `Idempotency-Key`: a repeat replays
  the first send instead of sending twice.

| You pass                                             | You get                                                                       |
| ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| `template: { id, variables }`                        | A send by key.                                                                |
| `from`, `subject`, `replyTo`, `tags`, `topicId`      | Ignored, with one `onWarning`.                                                |
| `html`, `react` or `text` without `template`         | `brew_template_required`: import the design into Brew and send it by key.     |
| `cc`, `bcc`, `attachments`, `headers`, `scheduledAt` | `brew_unsupported_field`.                                                     |
| Several `to` recipients                              | `brew_unsupported_field`, pointing at `batch.send` (one entry per recipient). |

`brew_template_required` says: "Brew sends app email from templates.
Import this design into Brew and send it by key: run
`npx @brew.new/cli migrate resend`, or see
https://docs.brew.new/migrations/resend". That command imports your Resend
templates into Brew and rewrites these call sites to send by key. The
adapter exports both as `RESEND_MIGRATION_COMMAND` and
`RESEND_MIGRATION_DOCS_URL`.

## `batch.send(emails, { idempotencyKey? })`

Sends up to 100 emails one at a time, in order, and answers
`{ data: { data: [{ id }, …] }, error }`.

- Every email is checked before the first one is sent, so a bad entry
  sends nothing.
- **Not atomic.** When a send fails, the ones before it were sent and the
  rest are not; `error.message` says how far it got.
- With `idempotencyKey`, email `i` is sent with `${idempotencyKey}:${i}`,
  so retrying the same batch replays the sent emails and sends the rest.
  A key longer than 97 characters is first shortened to its first 32
  characters and its SHA-256, so every key fits the API's 100-character
  limit.

## Errors

`error` is `{ name, message, statusCode }`, plus `brewCode` and `requestId`
when Brew answered (share the request id with support).

| Brew answered                                                     | `name`                           |
| ----------------------------------------------------------------- | -------------------------------- |
| No API key (`AUTHENTICATION_REQUIRED`, or none given)             | `missing_api_key`                |
| `401` / `403` (`INVALID_API_KEY`, …)                              | `invalid_api_key`                |
| `INSUFFICIENT_PERMISSIONS`, `INSUFFICIENT_ROLE`                   | `restricted_api_key`             |
| `404` (`TRIGGER_KEY_NOT_FOUND`, …)                                | `not_found`                      |
| `429` (`RATE_LIMITED`)                                            | `rate_limit_exceeded`            |
| `SANDBOX_DAILY_LIMIT`                                             | `daily_quota_exceeded`           |
| `SEND_QUOTA_EXCEEDED`                                             | `monthly_quota_exceeded`         |
| `IDEMPOTENCY_CONFLICT`                                            | `invalid_idempotent_request`     |
| `IDEMPOTENCY_IN_PROGRESS`                                         | `concurrent_idempotent_requests` |
| Any other `4xx` (`INVALID_PAYLOAD`, `NO_PUBLISHED_AUTOMATION`, …) | `validation_error`               |
| Refused before sending (a blank or over-long `idempotencyKey`)    | `validation_error`               |
| `5xx`, a timeout or a dropped connection (`statusCode: null`)     | `application_error`              |

## What does not carry over

Brew sends app email from a published automation, so there is no
raw-HTML send, no `cc`/`bcc`, no attachments and no scheduled send.
Import each Resend template into Brew (a React Email file or HTML), set
its trigger key, and map the old id in `templates` until every call site
uses the key directly.
