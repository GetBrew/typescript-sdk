# `brew.emails`

List saved emails, generate new ones, import existing HTML/JSX, edit
them, and **send** a design to a target. A send delivers a saved email
design to a recipient target (a saved audience or an inline address) — it
is not campaign-specific, so the send action lives here on `emails`. Send
**reads** (lifecycle, stats, per-recipient events) live on
`brew.analytics.sends.*`; see [`docs/analytics.md`](./analytics.md#sends).

Reads are flat — one read per resource, identity in the query
(`?emailId`), `?include` for opt-in expansions; writes are path-based.
Detail mode = pass the id key → a single-row page `{ data: [row] }`, no
`pagination`.

| Method                  | HTTP                         | Scope    |
| ----------------------- | ---------------------------- | -------- |
| [`list`](#list)         | `GET /v1/emails`             | `emails` |
| [`generate`](#generate) | `POST /v1/emails`            | `emails` |
| [`import`](#import)     | `POST /v1/emails/import`     | `emails` |
| [`edit`](#edit)         | `PATCH /v1/emails/{emailId}` | `emails` |
| [`send`](#send)         | `POST /v1/sends`             | `sends`  |

## Shared types

```ts
type EmailSummary = {
  readonly emailId: string
  readonly emailVersionId?: string
  readonly title: string
}

type EmailStatus = 'streaming' | 'complete' | 'error'

type GeneratedEmailArtifact = {
  readonly emailId: string
  readonly emailVersionId: string
  readonly html: string
  readonly previewImage?: string // rendered screenshot URL
}

type GeneratedEmailTextResponse = {
  readonly response: string
}
```

---

## `list`

The single email read. Omit `emailId` → list the latest logical emails
for the current organization. Pass `emailId` → a single-row page
`{ data: [row] }` (no `pagination`). `include` is detail-only and
**requires** `emailId`; it accepts `'html' | 'versions'` as an array or a
comma-separated string. This one method replaces the old `emails.get`
and `emails.versions` reads.

```ts
type ListEmailsInput = {
  readonly emailId?: string
  readonly include?:
    | ReadonlyArray<'html' | 'versions'>
    | string // comma-separated, e.g. 'html,versions' — detail-only
  readonly status?: EmailStatus
  readonly createdAtFrom?: string
  readonly createdAtTo?: string
  readonly updatedAtFrom?: string
  readonly updatedAtTo?: string
  readonly limit?: number
  readonly cursor?: string
}

type EmailsListResponse = {
  readonly data: ReadonlyArray<EmailSummary>
  readonly pagination?: {
    readonly limit: number
    readonly cursor: string | null
    readonly hasMore: boolean
  }
}

list(input?: ListEmailsInput): Promise<EmailsListResponse>
```

List mode:

```ts
const { data } = await brew.emails.list({
  status: 'complete',
})

for (const email of data) {
  console.log(email.emailId, email.title)
}
```

Detail mode — pass the `emailId` key and opt into expansions. The result
is a single-row page, so read `data[0]`:

```ts
const { data } = await brew.emails.list({
  emailId: 'email_123',
  include: 'html,versions',
})
const email = data[0]
console.log(email.title)
```

---

## `generate`

Generate a new email from a prompt and optional context.

The brand is resolved from the API key. `GenerateEmailInput` does **not**
accept a `brandId` field — sending one returns `400 INVALID_REQUEST`.

```ts
type GenerateEmailInput = {
  readonly prompt: string
  readonly contentUrls?: ReadonlyArray<string>
  readonly referenceEmailId?: string
}

type GenerateEmailResponse =
  | GeneratedEmailArtifact
  | GeneratedEmailTextResponse

generate(
  input: GenerateEmailInput,
  options?: RequestOptions
): Promise<GenerateEmailResponse>
```

### Long-running calls

`POST /v1/emails` typically takes 30–90 seconds because the agent plans,
renders the design, and produces a screenshot before responding.
The SDK applies a per-request timeout of **4 minutes** for this endpoint
(versus the 30-second default for everything else). You can override it:

```ts
import { AbortController } from 'node:abort-controller' // Node < 18

const controller = new AbortController()
const result = await brew.emails.generate(
  { prompt: 'Create a welcome email for new subscribers' },
  {
    timeoutMs: 300_000, // 5 minutes
    signal: controller.signal,
  }
)
```

### Handling the response union

`generate` returns a union — narrow on `emailId` to access the artifact:

```ts
const result = await brew.emails.generate({
  prompt: 'Create a welcome email for new subscribers',
  referenceEmailId: 'seed-vercel-newsletter',
})

if ('emailId' in result) {
  console.log(result.emailId)
  console.log(result.html)
  // result.previewImage is the storage URL of the rendered screenshot
} else {
  // The agent answered with prose instead of an artifact (rare —
  // happens when the prompt asks a question rather than asking for
  // an email). Surface `result.response` to the user.
  console.log(result.response)
}
```

---

## `import`

Import existing markup — raw `html`, `mjml`, or react-email `jsx` — into a
saved, editable Brew email. The markup is transcribed into a clean design
and every external image is re-hosted on the Brew CDN. Returns the same
artifact shape as [`generate`](#generate) (HTTP 201). POST requests get an
auto-generated `Idempotency-Key`, so retries never double-import; you can
also supply your own via `RequestOptions.idempotencyKey`.

```ts
type ImportEmailInput = {
  readonly format: 'html' | 'mjml' | 'jsx'
  readonly content: string // the raw markup as a string
  readonly title?: string
  readonly baseUrl?: string // base for resolving relative asset URLs
}

import(
  input: ImportEmailInput,
  options?: RequestOptions
): Promise<GeneratedEmailArtifact>
```

```ts
const imported = await brew.emails.import({
  format: 'html',
  content: '<html><body><h1>Hello</h1></body></html>',
  title: 'Imported welcome',
})

console.log(imported.emailId, imported.emailVersionId)
console.log(imported.html)
// imported.previewImage is the storage URL of the rendered screenshot
```

---

## `edit`

Edit a saved email by running the Brew email agent against its current
`latest` version. The new draft is persisted as a fresh `version: "latest"`
row on the same `emailId`, and the previous head is demoted to a
numeric historical version.

The brand is resolved from the API key. The `emailId` is sent on the
URL path. `EditEmailInput` does **not** accept a `brandId` or an
`emailId` field in the body — sending either returns
`400 INVALID_REQUEST`.

```ts
type EditEmailInput = {
  readonly emailId: string // path parameter
  readonly prompt: string
  readonly contentUrls?: ReadonlyArray<string>
}

type EditEmailResponse =
  | GeneratedEmailArtifact
  | GeneratedEmailTextResponse

edit(
  input: EditEmailInput,
  options?: RequestOptions
): Promise<EditEmailResponse>
```

### Example

```ts
const generated = await brew.emails.generate({
  prompt: 'Create a welcome email for new subscribers',
})

if ('emailId' in generated) {
  const edited = await brew.emails.edit({
    emailId: generated.emailId,
    prompt: 'Tighten the headline and add a friendlier sign-off.',
  })

  if ('emailId' in edited) {
    // Same emailId, new latest version stored in Convex.
    console.log(edited.emailId, edited.html)
  }
}
```

### Long-running calls

Edit runs the same agent loop as generate (planning, render,
screenshot). The SDK applies the same **4-minute** per-request timeout
ceiling. Caller-supplied `RequestOptions.timeoutMs` and
`RequestOptions.signal` still win. The constant
`EDIT_EMAIL_DEFAULT_TIMEOUT_MS` is exported from the public entrypoint
for callers that want to compose their own timeouts.

### Idempotency

PATCH requests do not auto-attach an `Idempotency-Key`, but you can opt
in via `RequestOptions.idempotencyKey` to make replays safe across the
24-hour window the server caches them for:

```ts
await brew.emails.edit(
  { emailId: 'email_123', prompt: 'Tighten the headline.' },
  { idempotencyKey: `edit-${dailyJobRunId}` }
)
```

### Errors

| Status | Code                   | Cause                                                                                                                      |
| ------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 400    | `INVALID_REQUEST`      | Missing `prompt`, invalid `contentUrls`, or unsupported field (e.g. `brandId`, `emailId` in body)                          |
| 404    | `EMAIL_NOT_FOUND`      | The email doesn't exist for the brand bound to your key. Cross-brand ids surface here (not 403) to avoid leaking existence |
| 409    | `EMAIL_IN_PROGRESS`    | The target email is currently being generated. Retry shortly                                                               |
| 409    | `IDEMPOTENCY_CONFLICT` | Reused `Idempotency-Key` with a different request body                                                                     |
| 422    | `BRAND_NOT_READY`      | The brand bound to the API key has not finished extraction                                                                 |

---

## Send shared types

```ts
type SendAcceptedResponse = {
  readonly status: 'queued' | 'scheduled'
  readonly sendId: string
  readonly runId: string
  readonly scheduledAt?: string // ISO-8601
}

type SendTestResponse = {
  readonly status: 'sent'
  readonly recipient: string
}

type SendResponse = SendAcceptedResponse | SendTestResponse
```

The `Send` row, `SendStats`, and `SendStatus` types belong to the
analytics surface — see [`docs/analytics.md`](./analytics.md#sends).

---

## `send`

The single polymorphic send. The input is a union discriminated by
`test`, and the response shape follows the input:

- **Test send** (`test: true`) — a one-off [TEST] delivery to a single
  recipient. Forces the Brew default sender (no verified domain or saved
  audience required) and never creates a send row. Resolves synchronously
  (HTTP 200) with `{ status: 'sent', recipient }`.
- **Campaign send** (omit `test`) — delivers a saved design to a target.
  Provide EXACTLY ONE recipient target — `audienceId` (a saved audience)
  or `to` (a single inline address or an array, max 50). Requires a
  verified sending `domainId`. Returns when the job is accepted (HTTP
  202), not when delivery completes, with
  `{ status: 'queued' | 'scheduled', sendId, runId }`.

Both modes require the `sends` scope. A design can be sent unlimited
times; every campaign call mints a new send. This one method merges the
old campaign-send and test-send methods into a single polymorphic call.

Campaign send:

```ts
const result = await brew.emails.send({
  emailId: 'email_123',
  domainId: 'domain_123',
  subject: 'Welcome to Brew',
  audienceId: 'aud_123',
})
// { status: 'queued' | 'scheduled', sendId, runId }
```

Test send — discriminate on `test: true`:

```ts
const result = await brew.emails.send({
  test: true,
  emailId: 'email_123',
  subject: 'Preview: Welcome to Brew',
  to: 'qa@example.com',
})
// { status: 'sent', recipient: 'qa@example.com' }
```

Poll a campaign send for lifecycle + stats:

```ts
const [send] = (await brew.analytics.sends.list({ emailId: 'email_123' })).data
console.log(send.status, send.stats?.delivered)
```
