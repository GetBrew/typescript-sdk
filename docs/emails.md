# `brew.emails`

List saved emails, generate new ones, import existing HTML/JSX, edit
them, and **send** a design to a target. A send delivers a saved email
design to a recipient target (a saved audience or an inline address) — it
is not campaign-specific, so the send action lives here on `emails`. Send
**reads** (lifecycle, stats, per-recipient events) live on
`brew.sends.*`; see [`docs/sends.md`](./sends.md).

| Method                                          | HTTP                                                    | Scope    |
| ----------------------------------------------- | ------------------------------------------------------- | -------- |
| [`list`](#list)                                 | `GET /v1/emails`                                        | `emails` |
| [`get`](#get)                                   | `GET /v1/emails/{emailId}`                              | `emails` |
| [`generate`](#generate)                         | `POST /v1/emails`                                       | `emails` |
| [`import`](#import)                             | `POST /v1/emails/import`                                | `emails` |
| [`edit`](#edit)                                 | `PATCH /v1/emails/{emailId}`                            | `emails` |
| [`restore`](#restore)                           | `POST /v1/emails/{emailId}/restore`                     | `emails` |
| [`export`](#export)                             | `POST /v1/emails/{emailId}/export`                      | `emails` |
| [`auditEmail`](#auditemail)                     | `POST /v1/emails/audit`                                 | `emails` |
| [`getAudit`](#getaudit)                         | `GET /v1/emails/audits/{auditId}`                       | `emails` |
| [`previewClients`](#previewclients)             | `POST /v1/emails/{emailId}/client-previews`             | `emails` |
| [`getClientPreview`](#getclientpreview)         | `GET /v1/emails/client-previews/{previewId}`            | `emails` |
| [`inboxPlacementTests.*`](#inboxplacementtests) | `/v1/emails/{emailId}/inbox-placement-tests[/{testId}]` | `emails` |
| [`send`](#send)                                 | `POST /v1/sends`                                        | `sends`  |

> **Changed in 11.0.0.** `previewClients` starts a rendering job and
> `getClientPreview(previewId)` polls it (the call no longer blocks for
> screenshots). `get` takes `emailVersionId` or `runId` and returns the
> detail row (`previewStatus`, `version`, `runId`, and `errorMessage` on a
> failed run). `edit` can change only `title` / `subjectLine` / `groupId`
> without a prompt. `getAudit(auditId)` reads a saved audit for free.

> **Changed in 10.0.0.** `get(emailId, { include })` is a real route
> returning the bare row; the `emailId` and `include` query filters on
> `GET /v1/emails` are gone. The list window params collapsed into
> `from` / `to` plus `sortBy`. `emails.createInboxPlacementTest` and
> `emails.getInboxPlacementResults` became
> `emails.inboxPlacementTests.create` / `.list` / `.get`.

## Shared types

```ts
type EmailSummary = {
  readonly emailId: string
  readonly emailVersionId?: string
  readonly title: string
  readonly status: EmailStatus
  readonly previewImage?: string
  readonly updatedAt: string
  readonly subjectLine?: string
  readonly previewText?: string
  readonly group: { groupId: string; groupName: string } | null
  // With `get(emailId, { include })`: `html` and/or `versions`.
  readonly html?: string
  readonly versions?: ReadonlyArray<{
    version: number | 'latest'
    emailVersionId: string
  }>
}

// The one v1 vocabulary. The old `streaming` / `complete` / `error`
// spellings are gone and now 400 as a status FILTER.
type EmailStatus = 'generating' | 'ready' | 'failed'

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

The latest version of each design, under the uniform
`{ data, pagination }` envelope. Rows are lean — no `html`, no
`versions`.

```ts
type ListEmailsInput = {
  readonly status?: EmailStatus // generating | ready | failed
  readonly groupId?: string
  readonly sortBy?: 'createdAt' | 'updatedAt' // default updatedAt
  readonly from?: string // ISO-8601
  readonly to?: string // ISO-8601
  readonly limit?: number
  readonly cursor?: string
}

type EmailsListResponse = {
  readonly data: ReadonlyArray<EmailSummary>
  readonly pagination: {
    readonly limit: number
    readonly cursor: string | null
    readonly hasMore: boolean
  }
}

list(input?: ListEmailsInput): Promise<EmailsListResponse>
```

```ts
const { data } = await brew.emails.list({
  status: 'ready',
  sortBy: 'createdAt',
  from: '2026-04-01T00:00:00.000Z',
})

for (const email of data) {
  console.log(email.emailId, email.title)
}
```

The four `createdAtFrom` / `createdAtTo` / `updatedAtFrom` /
`updatedAtTo` params collapsed into one `from` / `to` pair, with
`sortBy` choosing which timestamp they apply to. There is no `emailId`
filter: use [`get`](#get).

---

## `get`

One design, as the bare row. An unknown or cross-brand id is
`404 EMAIL_NOT_FOUND`.

```ts
const email = await brew.emails.get('email_123')
console.log(email.title, email.status)

// Opt into the rendered HTML and the version history:
const full = await brew.emails.get('email_123', {
  include: ['html', 'versions'],
})
console.log(full.html?.length)
for (const version of full.versions ?? []) {
  console.log(version.version, version.emailVersionId)
}
```

The `emailVersionId` values from `include: 'versions'` are exactly what
[`restore`](#restore) takes.

Read a saved version with `emailVersionId`, or poll a generation with the
`runId` that `generate` / `edit` returned while it was `generating`:

```ts
const pinned = await brew.emails.get('email_123', {
  emailVersionId: 'emv_123_v1',
})

const run = await brew.emails.get('email_123', { runId: 'run_abc' })
if (run.status === 'failed') {
  console.log(run.errorMessage)
}
console.log(run.previewStatus) // 'available' | 'unavailable' | 'not_ready'
```

`emailVersionId` and `runId` are mutually exclusive. An unknown version or
run is `404 EMAIL_VERSION_NOT_FOUND`.

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

Send only `title`, `subjectLine` and/or `groupId` (`null` ungroups) with
no `prompt` to rename, retitle or refile the design without an AI edit or a
charge; the three apply in one atomic write.

```ts
type EditEmailInput = {
  readonly emailId: string // path parameter
  readonly prompt?: string // omit for a metadata-only edit
  readonly contentUrls?: ReadonlyArray<string>
  readonly title?: string
  readonly subjectLine?: string
  readonly groupId?: string | null
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

## `auditEmail`

Lint the exact HTML and inbox copy that you plan to send. The audit checks
unsubscribe content, links, images, loaded size, accessibility, compatibility,
markup, subject copy, and preview copy in parallel.

```ts
type AuditEmailInput = {
  readonly emailHtml: string
  readonly subject?: string
  readonly previewText?: string
  readonly sendingPurpose?: 'marketing' | 'transactional'
}

auditEmail(
  input: AuditEmailInput,
  options?: RequestOptions
): Promise<EmailAuditResponse>
```

Branch on `completion.status`. A complete result has a numeric score and costs
5 credits. A partial result has `score: null`, costs 0 credits, and does not
establish readiness.

```ts
const audit = await brew.emails.auditEmail({
  emailHtml,
  subject: 'Your August account update',
  previewText: 'A quick look at what changed this month.',
  sendingPurpose: 'marketing',
})

if (audit.completion.status === 'complete') {
  console.log(audit.completion.readiness, audit.completion.score)
} else {
  console.log('Audit incomplete. Retry before claiming readiness.')
}
```

The endpoint can run for up to 50 seconds. The SDK uses
`AUDIT_EMAIL_DEFAULT_TIMEOUT_MS`, which is 65 seconds, unless the caller sets
`RequestOptions.timeoutMs` or `RequestOptions.signal`. Pass `{ raw: true }` to
read `X-Credit-Cost`.

Audit admission is 6 calls per minute per credential or session and 20 calls
per minute per organization. Brew runs at most 4 audits concurrently per
organization and 16 globally. A capacity rejection returns `429 RATE_LIMITED`
with `Retry-After` and does not run or charge the audit.

---

## `getAudit`

Read one page of a saved audit's findings — ids, rule ids, targets,
remediation and the audited `contentHash`. Free; it never reruns the audit.
Continue with `pagination.cursor`. Reports are kept for seven days; an
expired or unknown id is `404 AUDIT_NOT_FOUND`.

```ts
getAudit(
  auditId: string,
  options?: RequestOptions & { cursor?: string; limit?: number } // 1-100
): Promise<GetEmailAuditResponse>
```

```ts
const page = await brew.emails.getAudit('aud_123', { limit: 50 })
console.log(page.summary, page.findings.length)
if (page.pagination.hasMore && page.pagination.cursor) {
  await brew.emails.getAudit('aud_123', { cursor: page.pagination.cursor })
}
```

---

## `previewClients`

Start a rendering job for the design across **real email clients &
devices** — Gmail (web/Android/iOS), Outlook (2021/365/web), Apple Mail
(macOS/iOS), and Yahoo, with dark-mode variants. Poll it with
[`getClientPreview`](#getclientpreview) until every client settles; each
then carries a full-size screenshot on the Brew CDN.

The `emailId` is sent on the URL path. Pass `emailVersionId` to render a
saved version (omit for the latest), and `clients` (ids from the supported
catalogue — the OpenAPI description of the field carries the full
`id = label` list, e.g. `outlook2021_win11_dm_dt = Outlook 2021 (Windows,
Dark)`) to target specific inboxes/devices, or omit it for a popular
default spread.

```ts
type PreviewEmailClientsInput = {
  readonly emailId: string // path parameter
  readonly emailVersionId?: string
  readonly clients?: ReadonlyArray<string> // omit → default spread
}

type EmailClientPreviewResponse = {
  readonly previewId: string
  readonly emailId: string
  readonly emailVersionId?: string
  readonly status:
    | 'queued'
    | 'running'
    | 'completed'
    | 'partially_completed'
    | 'failed'
  readonly previews: ReadonlyArray<{
    readonly id: string
    readonly label: string // e.g. "Apple Mail (iOS, Dark)"
    readonly category: 'gmail' | 'outlook' | 'apple' | 'yahoo' | 'other'
    readonly os: string
    readonly dark: boolean
    readonly status: 'running' | 'completed' | 'failed'
    readonly imageUrl: string | null // cdn.brew.new screenshot when completed
    readonly reason?: string // why a client is pending or failed
    readonly retryable: boolean
  }>
  readonly pending: ReadonlyArray<string> // client ids still rendering
  readonly createdAt: string
  readonly expiresAt: string
  readonly nextPollAfterMs: number
  readonly credits: {
    readonly cost: number
    readonly status: 'reserved' | 'settled' | 'released'
  }
}

previewClients(
  input: PreviewEmailClientsInput,
  options?: RequestOptions
): Promise<EmailClientPreviewResponse>
```

```ts
let job = await brew.emails.previewClients({
  emailId: 'email_123',
  clients: ['outlook2021_win11_dm_dt', 'iphone16_18'],
})

while (job.status === 'queued' || job.status === 'running') {
  await new Promise((resolve) => setTimeout(resolve, job.nextPollAfterMs))
  job = await brew.emails.getClientPreview(job.previewId)
}

for (const preview of job.previews) {
  if (preview.status === 'completed') {
    console.log(preview.label, preview.imageUrl)
  } else {
    console.log(preview.label, preview.reason, preview.retryable)
  }
}
```

The call answers `202` with the admitted job, or `200` with the existing job
for the same version and clients (including its results when it already
finished).

### Cost & billing semantics

Fixed **10 credits** per job, reserved at admission and settled once.
A job that renders nothing releases the reservation (`credits.status:
'released'`). Polling never resubmits or charges again. Unknown client ids
are rejected with a `422` before any paid work happens.

### Long-running calls

Admission stages the design and answers promptly; rendering continues
server-side. The SDK keeps a **90-second** ceiling on the admission call
(`PREVIEW_EMAIL_CLIENTS_DEFAULT_TIMEOUT_MS`); caller-supplied
`RequestOptions.timeoutMs` / `RequestOptions.signal` still win.

### Errors

| Status | Code                       | Cause                                                                |
| ------ | -------------------------- | -------------------------------------------------------------------- |
| 402    | `INSUFFICIENT_CREDITS`     | The job's 10 credits cannot be reserved                              |
| 404    | `EMAIL_NOT_FOUND`          | The email doesn't exist for the brand bound to your key              |
| 409    | `IDEMPOTENCY_CONFLICT`     | Reused `Idempotency-Key` with a different request body               |
| 422    | `CONTENT_OPERATION_FAILED` | Unknown client id(s), the email is not ready, or its HTML is too big |

---

## `getClientPreview`

Read a rendering job by `previewId`. Poll it after `nextPollAfterMs` while
`status` is `queued` or `running`. Free; it never resubmits the job. An
unknown id is `404 PREVIEW_NOT_FOUND`.

```ts
getClientPreview(
  previewId: string,
  options?: RequestOptions
): Promise<GetEmailClientPreviewResponse> // same shape as the job above
```

---

## `restore`

Non-destructively clone a historical version into a NEW `latest` row —
the current head is demoted to history, nothing is lost.

```ts
type RestoreEmailInput = {
  readonly emailId: string
  readonly emailVersionId: string
}
```

The body takes `{ emailVersionId }` in 10.0.0, not the ordinal
`{ version }`. Read the ids from
`brew.emails.get(emailId, { include: 'versions' })`.

```ts
const { versions } = await brew.emails.get('email_123', {
  include: 'versions',
})
const previous = versions?.find((v) => v.version === 1)

await brew.emails.restore({
  emailId: 'email_123',
  emailVersionId: previous!.emailVersionId,
})
```

`404 EMAIL_VERSION_NOT_FOUND` when the version doesn't exist.

---

## `export`

Export a design to a connected ESP as a template.

```ts
const result = await brew.emails.export({
  emailId: 'email_123',
  provider: 'klaviyo',
  templateName: 'Launch email',
  dryRun: true, // was `dry_run`
})
// { emailId, provider, providerName, templateName, templateId?, dryRun }
```

Set `dryRun: true` to validate the design, brand ownership, and the ESP
connection without creating a template. Exporting to an ESP that is not
connected for the brand is `400 INTEGRATION_NOT_CONNECTED`; a provider
rejection or outage is `502 EXPORT_PROVIDER_ERROR`.

---

## `inboxPlacementTests`

Seed-list tests of where a design LANDS — inbox vs spam vs missing —
across real mailbox providers. Three methods on a nested resource; they
replaced the flat `emails.createInboxPlacementTest` and
`emails.getInboxPlacementResults`.

```ts
// Start a test on a VERIFIED sending domain — 202, fixed 10 credits.
const test = await brew.emails.inboxPlacementTests.create({
  emailId: 'email_123',
  domainId: 'domain_123',
  subject: 'Placement check',
})

// Poll ONE test by id — its own route now, FREE.
const result = await brew.emails.inboxPlacementTests.get(
  'email_123',
  test.testId
)
if (result.status === 'completed') {
  console.log(result.results?.overall)
  console.log(result.diagnosis)
}

// The design's recent tests as lean rows, FREE.
const { data } = await brew.emails.inboxPlacementTests.list({
  emailId: 'email_123',
})
```

`status` is the one v1 vocabulary — `queued | running | completed |
partially_completed | failed`. The old `collecting` value is now a
separate `phase` field (`sending` | `collecting`) that says what a
running test is busy with.

An unverified or cross-brand `domainId` is `422 DOMAIN_NOT_READY`.

---

## Send shared types

```ts
type SendAcceptedResponse = {
  readonly status: 'queued' | 'scheduled' | 'pending_approval'
  readonly sendId: string
  readonly scheduledAt?: string // ISO-8601
}

type SendTestResponse = {
  readonly status: 'completed'
  readonly recipient: string
}

type SendResponse = SendAcceptedResponse | SendTestResponse
```

`runId` is gone from the 202 — `sendId` is the only handle, and it is
what every `brew.sends.*` method takes. The test send answers
`status: 'completed'`, not `'sent'`.

The sender is the nested `from: { email, name? }` object, not the flat
`fromEmail` + `senderName` pair, and `replyTo` is a top-level string.

The `Send` row, `SendStats`, and `SendStatus` types live on the sends
surface — see [`docs/sends.md`](./sends.md).

---

## `send`

The single polymorphic send. The input is a union discriminated by
`test`, and the response shape follows the input:

- **Test send** (`test: true`) — a one-off [TEST] delivery to a single
  recipient. Forces the Brew default sender (no verified domain or saved
  audience required) and never creates a send row. Resolves synchronously
  (HTTP 200) with `{ status: 'completed', recipient }`.
- **Campaign send** (omit `test`) — delivers a saved design to a target.
  Provide EXACTLY ONE recipient target — `audienceId` (a saved audience,
  or the string `'all'` to target every contact in the brand) or `to` (a
  single inline address or an array, max 50). Requires a verified sending
  `domainId`. Returns when the job is accepted (HTTP 202), not when
  delivery completes, with `{ status, sendId }`.

Both modes require the `sends` scope. A design can be sent unlimited
times; every campaign call mints a new send. An exhausted plan quota is
`402 SEND_QUOTA_EXCEEDED`, the code that absorbed the old
`INSUFFICIENT_EMAIL_SENDS`.

Campaign send:

```ts
const result = await brew.emails.send({
  emailId: 'email_123',
  domainId: 'domain_123',
  subject: 'Welcome to Brew',
  audienceId: 'aud_123', // or 'all' for every contact in the brand
  from: { email: 'hello@acme.com', name: 'Acme' },
  replyTo: 'support@acme.com',
})
// { status: 'queued' | 'scheduled', sendId }
```

Test send — discriminate on `test: true`:

```ts
const result = await brew.emails.send({
  test: true,
  emailId: 'email_123',
  subject: 'Preview: Welcome to Brew',
  to: 'qa@example.com',
})
// { status: 'completed', recipient: 'qa@example.com' }
```

Poll a campaign send for lifecycle + stats:

```ts
const send = await brew.sends.get(result.sendId)
console.log(send.status, send.stats?.delivered)

// Or every send made from one design:
const { data } = await brew.sends.list({ emailId: 'email_123' })
```
