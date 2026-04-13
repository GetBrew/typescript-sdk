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
  readonly emailMobilePng?: string
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

```ts
type GenerateEmailInput = {
  readonly prompt: string
  readonly brandId?: string
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

```ts
const result = await brew.emails.generate({
  prompt: 'Create a welcome email for new subscribers',
  referenceEmailId: 'seed-vercel-newsletter',
})

if ('emailId' in result) {
  console.log(result.emailId)
  console.log(result.emailHtml)
} else {
  console.log(result.response)
}
```
