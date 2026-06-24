# `brew.sends`

Start campaign sends and fire one-off test/preview sends. `brew.sends`
is **write-only** — it covers exactly two methods. Send **reads**
(lifecycle, stats, per-recipient events) live on `brew.analytics.sends.*`;
see [`docs/analytics.md`](./analytics.md#sends).

| Method              | HTTP                  | Scope   |
| ------------------- | --------------------- | ------- |
| [`create`](#create) | `POST /v1/sends`      | `sends` |
| [`test`](#test)     | `POST /v1/sends/test` | `sends` |

## Shared types

```ts
type SendAcceptedResponse = {
  readonly status: 'queued' | 'scheduled'
  readonly sendId: string
  readonly runId: string
  readonly scheduledAt?: string // ISO-8601
}

type SendsTestResponse = {
  readonly status: 'sent'
  readonly recipient: string
}
```

The `Send` row, `SendStats`, and `SendStatus` types now belong to the
analytics surface — see [`docs/analytics.md`](./analytics.md#sends).

---

## `create`

Start an async campaign send using an existing saved email. Provide
EXACTLY ONE recipient target — `audienceId` (a saved audience) or `to`
(a single inline address or an array, max 50). Returns when the job is
accepted (HTTP 202), not when delivery completes. Requires a verified
sending `domainId`.

```ts
const result = await brew.sends.create({
  emailId: 'email_123',
  domainId: 'domain_123',
  subject: 'Welcome to Brew',
  audienceId: 'aud_123',
})
// { status: 'queued' | 'scheduled', sendId, runId, scheduledAt? }
```

Poll the resulting send by id for lifecycle + stats:

```ts
const send = await brew.analytics.sends.get({ sendId: result.sendId })
console.log(send.status, send.stats?.delivered)
```

---

## `test`

Send a one-off [TEST] delivery to a single recipient. Forces the Brew
default sender (no verified domain or audience required) and never
creates a send row. Resolves synchronously (HTTP 200).

```ts
const { status, recipient } = await brew.sends.test({
  emailId: 'email_123',
  subject: 'Preview: Welcome to Brew',
  to: 'qa@example.com',
})
// { status: 'sent', recipient: 'qa@example.com' }
```
