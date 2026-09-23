# `brew.sends`

Sends read and write at their own root. A send is created via
[`brew.emails.send`](./emails.md#send) (`POST /v1/sends`); this namespace
carries every read of a send and every action you take on one after it
exists.

| Method                | HTTP                             | Scope   |
| --------------------- | -------------------------------- | ------- |
| [`list`](#list)       | `GET /v1/sends`                  | `sends` |
| [`listAll`](#listall) | `GET /v1/sends` (paged)          | `sends` |
| [`get`](#get)         | `GET /v1/sends/{sendId}`         | `sends` |
| [`cancel`](#cancel)   | `POST /v1/sends/{sendId}/cancel` | `sends` |
| [`pause`](#pause)     | `POST /v1/sends/{sendId}/pause`  | `sends` |
| [`resume`](#resume)   | `POST /v1/sends/{sendId}/resume` | `sends` |

> **New in 10.0.0.** `list` / `listAll` / `get` replaced
> `analytics.campaigns()` and `analytics.sends.*`. Campaign KPIs are just
> `sends.list({ kind: 'campaign' })` — every row already carries its
> aggregate `stats`.

## Shared types

```ts
// The one v1 status vocabulary.
type SendStatus =
  | 'scheduled'
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed'
  | 'partially_completed'
  | 'failed'
  | 'canceled'

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
  readonly sendId: string
  readonly kind: 'campaign' | 'automation'
  readonly messageClass?: 'marketing' | 'transactional'
  readonly emailId: string
  readonly status: SendStatus
  // Provenance for an automation send — trace a row back to the fire.
  readonly automationId?: string
  readonly nodeId?: string
  readonly automationRunId?: string
  readonly audienceRunId?: string
  readonly triggerInstanceId?: string
  readonly from?: { readonly email: string; readonly name?: string }
  readonly replyTo?: string
  readonly audienceId?: string
  readonly audienceName?: string
  readonly recipientCount?: number
  readonly scheduledAt?: string
  readonly completedAt?: string
  readonly stats?: SendStats
  readonly createdAt: string
  readonly updatedAt: string
  // ...plus emailVersionId, subject, previewText, domainId, delivery,
  // gradualSend, startedAt, failedAt, error. With `include: 'events'` on
  // `get`, a bounded first page of per-recipient `events[]` is inlined.
}
```

`runId` is gone from send rows and from the send `202`. `sendId` is the
only handle, and it is what every method here takes.

## `list`

Every send the brand has made, newest first, under the uniform
`{ data, pagination }` envelope.

```ts
const { data, pagination } = await brew.sends.list({
  kind: 'campaign',
  status: 'completed',
  from: '2026-04-01T00:00:00.000Z',
  limit: 50,
})

for (const send of data) {
  console.log(send.emailId, send.stats?.delivered)
}
```

Filters: `kind` (`campaign` | `automation`), `emailId`, `messageClass`,
the automation provenance ids (`automationId`, `automationRunId`,
`audienceRunId`, `triggerInstanceId`), `status`, and the `from` / `to`
ISO-8601 window. Page with `limit` / `cursor`.

`status` accepts only the vocabulary above — the old `sent` / `sending`
spellings now `400`. There is no `sendId` filter: use [`get`](#get).

## `listAll`

Async iterator over every matching send. Same filters as `list` minus
`cursor` — the iterator owns cursor state.

```ts
for await (const send of brew.sends.listAll({ kind: 'campaign' })) {
  console.log(send.sendId, send.stats?.delivered)
}
```

## `get`

One send, returned as the **bare row** (no `{ data }` envelope).

```ts
const send = await brew.sends.get('snd_8fK2mQ4p')
console.log(send.status, send.stats?.opened)

// With the per-recipient event page inlined:
const withEvents = await brew.sends.get('snd_8fK2mQ4p', {
  include: 'events',
})
console.log(withEvents.events?.length)
```

An unknown or cross-brand `sendId` is `404 SEND_NOT_FOUND` — no more
testing a list page for emptiness.

## `cancel`

Cancel a scheduled or queued send before it goes out. Requires the
`sends` scope.

```ts
const result = await brew.sends.cancel('snd_8fK2mQ4p')
// { sendId: 'snd_8fK2mQ4p', status: 'canceled' }
```

The action is **idempotent** — a send that is already `canceled` resolves
`200` with the same body, so retries are safe. Supply
`{ idempotencyKey }` to make a retried cancel return the original
response; one is generated automatically otherwise (see
[`docs/retries-and-idempotency.md`](./retries-and-idempotency.md)).

```ts
await brew.sends.cancel('snd_8fK2mQ4p', { idempotencyKey: 'cancel-001' })
```

### Errors

- **`409 SEND_NOT_CANCELLABLE`** — the send has already started or
  finished (`running`, `completed`, `partially_completed`, or `failed`)
  and can no longer be stopped.
- **`404 SEND_NOT_FOUND`** — unknown or cross-brand `sendId` (sends are
  brand-scoped to the key).

## `pause`

The reversible stop on an in-flight gradual send. Recipients already
mailed stay mailed; the remaining chunks stop going out.

```ts
await brew.sends.pause('snd_8fK2mQ4p')
// { sendId: 'snd_8fK2mQ4p', status: 'paused' }
```

`409 SEND_NOT_PAUSABLE` when the send is already `completed`, `canceled`,
or was never a gradual send.

## `resume`

Pick a paused ramp back up where it left off.

```ts
await brew.sends.resume('snd_8fK2mQ4p')
// { sendId: 'snd_8fK2mQ4p', status: 'running' }
```

`409 SEND_NOT_RESUMABLE` when the send is canceled, finished, or was
never paused.

Pass `{ raw: true }` in `options` on any method to receive the full
`BrewRawResponse<T>` (status, headers, request id) instead of the
unwrapped payload.
