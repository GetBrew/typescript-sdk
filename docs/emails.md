# `brew.emails`

Three methods for listing saved emails, generating new ones, and editing existing ones.

| Method                  | HTTP                         |
| ----------------------- | ---------------------------- |
| [`list`](#list)         | `GET /v1/emails`             |
| [`generate`](#generate) | `POST /v1/emails`            |
| [`edit`](#edit)         | `PATCH /v1/emails/{emailId}` |

## Shared types

```ts
type EmailSummary = {
  readonly emailId: string
  readonly emailTitle: string
}

type EmailStatus = 'streaming' | 'complete' | 'error'

type GeneratedEmailArtifact = {
  readonly emailId: string
  readonly emailHtml: string
  readonly emailPng?: string
}

type GeneratedEmailTextResponse = {
  readonly response: string
}
```

---

## `list`

List latest logical emails for the current organization.

```ts
type ListEmailsInput = {
  readonly status?: EmailStatus
  readonly createdAtFrom?: string
  readonly createdAtTo?: string
  readonly updatedAtFrom?: string
  readonly updatedAtTo?: string
}

type ListEmailsResponse = {
  readonly emails: ReadonlyArray<EmailSummary>
}

list(input?: ListEmailsInput): Promise<ListEmailsResponse>
```

```ts
const { emails } = await brew.emails.list({
  status: 'complete',
})
```

---

## `generate`

Generate a new email from a prompt and optional context.

The brand is resolved from the API key. `GenerateEmailInput` does **not**
accept a `brandId` field — sending one returns `400 INVALID_REQUEST`.

```ts
type GenerateEmailInput = {
  readonly prompt: string
  readonly contentUrl?: string
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
generates JSX, renders HTML, and produces a screenshot before responding.
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
  console.log(result.emailHtml)
  // result.emailPng is the storage URL of the rendered screenshot
} else {
  // The agent answered with prose instead of an artifact (rare —
  // happens when the prompt asks a question rather than asking for
  // an email). Surface `result.response` to the user.
  console.log(result.response)
}
```

---

## `edit`

Edit a saved email by running the Brew email agent against its current
`latest` JSX. The new draft is persisted as a fresh `version: "latest"`
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
  readonly contentUrl?: string
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
    console.log(edited.emailId, edited.emailHtml)
  }
}
```

### Long-running calls

Edit runs the same agent loop as generate (planning, JSX, HTML render,
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
| 400    | `INVALID_REQUEST`      | Missing `prompt`, invalid `contentUrl`, or unsupported field (e.g. `brandId`, `emailId` in body)                           |
| 404    | `EMAIL_NOT_FOUND`      | The email doesn't exist for the brand bound to your key. Cross-brand ids surface here (not 403) to avoid leaking existence |
| 409    | `EMAIL_IN_PROGRESS`    | The target email is currently being generated. Retry shortly                                                               |
| 409    | `IDEMPOTENCY_CONFLICT` | Reused `Idempotency-Key` with a different request body                                                                     |
| 422    | `BRAND_NOT_READY`      | The brand bound to the API key has not finished extraction                                                                 |
