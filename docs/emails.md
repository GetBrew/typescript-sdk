# `brew.emails`

Two methods for listing saved emails and generating new ones.

| Method                  | HTTP              |
| ----------------------- | ----------------- |
| [`list`](#list)         | `GET /v1/emails`  |
| [`generate`](#generate) | `POST /v1/emails` |

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
