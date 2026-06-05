# `brew.sends`

Start campaign sends, fire one-off test/preview sends, and inspect send
lifecycle + stats.

| Method                | HTTP                     | Scope   |
| --------------------- | ------------------------ | ------- |
| [`create`](#create)   | `POST /v1/sends`         | `sends` |
| [`test`](#test)       | `POST /v1/sends`         | `sends` |
| [`list`](#list)       | `GET /v1/sends`          | `sends` |
| [`listAll`](#listall) | `GET /v1/sends` (paged)  | `sends` |
| [`get`](#get)         | `GET /v1/sends?emailId=` | `sends` |

## Shared types

```ts
type SendStatus = 'scheduled' | 'queued' | 'sending' | 'sent' | 'failed'

type SendStats = {
  readonly sent: number
  readonly delivered: number
  readonly opened: number
  readonly clicked: number
  readonly bounced: number
  readonly complained: number
  readonly unsubscribed: number
}

type Send = {
  readonly emailId: string
  readonly status: SendStatus
  readonly audienceId?: string
  readonly runId?: string
  readonly scheduledAt?: string
  readonly completedAt?: string
  readonly stats?: SendStats
  readonly createdAt: string
  readonly updatedAt: string
  // ...plus emailVersionId, audienceName, startedAt, failedAt, error
}
```

---

## `create`

Start an async campaign send using an existing saved email. Returns when the
job is accepted (HTTP 202), not when delivery completes. Requires a verified
sending `domainId`.

```ts
const result = await brew.sends.create({
  emailId: 'email_123',
  domainId: 'domain_123',
  subject: 'Welcome to Brew',
  audienceId: 'aud_123',
})
// { status: 'queued' | 'scheduled', runId, scheduledAt? }
```

---

## `test`

Send a one-off test/preview to a single recipient. Forces the Brew default
sender (no verified domain or audience required) and does NOT consume the
email's single live-send slot. Resolves synchronously (HTTP 200).

```ts
const { status, recipient } = await brew.sends.test({
  emailId: 'email_123',
  subject: 'Preview: Welcome to Brew',
  to: 'qa@example.com',
})
// { status: 'sent', recipient: 'qa@example.com' }
```

---

## `list`

List campaign sends for the brand, newest first, with lifecycle status and
aggregate `stats`. Returns `{ sends, pagination }`.

```ts
const { sends, pagination } = await brew.sends.list({
  status: 'sent',
  from: '2026-04-01T00:00:00.000Z',
  limit: 50,
})
```

---

## `listAll`

Async iterator that pages through every matching send, following
`pagination.cursor` for you.

```ts
for await (const send of brew.sends.listAll({ status: 'sent' })) {
  console.log(send.emailId, send.stats?.delivered)
}
```

---

## `get`

Fetch the send for a single email. Returns a one-element `{ sends: [row] }`
envelope, or `404 SEND_NOT_FOUND` on a miss.

```ts
const { sends } = await brew.sends.get({ emailId: 'email_123' })
const send = sends[0]!
```
