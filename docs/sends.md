# `brew.sends`

One method for starting an async send.

| Method              | HTTP             |
| ------------------- | ---------------- |
| [`create`](#create) | `POST /v1/sends` |

## Shared types

```ts
type SendAcceptedStatus = 'queued' | 'scheduled'

type SendAcceptedResponse = {
  readonly status: SendAcceptedStatus
  readonly runId: string
  readonly scheduledAt?: string
}
```

The send endpoint is asynchronous. It returns when the send has been
accepted by Brew, not when the final delivery completes.

---

## `create`

Start a send using an existing saved email.

```ts
type CreateSendInput = {
  readonly emailId: string
  readonly domainId: string
  readonly subject: string
  readonly previewText?: string
  readonly replyTo?: string
  readonly audienceId?: string
  readonly emails?: ReadonlyArray<string>
  readonly scheduledAt?: string
}

create(
  input: CreateSendInput,
  options?: RequestOptions
): Promise<SendAcceptedResponse>
```

```ts
const result = await brew.sends.create({
  emailId: 'email_123',
  domainId: 'domain_123',
  subject: 'Welcome to Brew',
  audienceId: 'aud_123',
})
```

Use exactly one recipient mode.

- `audienceId`
- `emails`
