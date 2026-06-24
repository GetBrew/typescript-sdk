# `brew.analytics`

Read-only campaign + automation analytics, a unified cross-domain event
explorer, the campaign-send reads (`analytics.sends.*`), and the
fired-trigger instance history (`analytics.triggerInstances.*`).

| Method                                       | HTTP                                          | Scope         |
| -------------------------------------------- | --------------------------------------------- | ------------- |
| [`campaigns`](#campaigns)                    | `GET /v1/analytics/campaigns`                 | `emails`      |
| [`automations`](#automations)                | `GET /v1/analytics/automations`               | `automations` |
| [`events`](#events)                          | `GET /v1/analytics/events`                    | `emails`      |
| [`eventsAll`](#eventsall)                    | `GET /v1/analytics/events`                    | `emails`      |
| [`sends.list`](#sends)                       | `GET /v1/analytics/sends`                     | `sends`       |
| [`sends.listAll`](#sends)                    | `GET /v1/analytics/sends` (paged)             | `sends`       |
| [`sends.get`](#sends)                        | `GET /v1/analytics/sends/{sendId}`            | `sends`       |
| [`sends.listEvents`](#sends)                 | `GET /v1/analytics/sends/{sendId}/events`     | `emails`      |
| [`sends.listAllEvents`](#sends)              | `GET /v1/analytics/sends/{sendId}/events`     | `emails`      |
| [`sends.listForEmail`](#sends)               | `GET /v1/emails/{emailId}/sends`              | `sends`       |
| [`sends.listAllForEmail`](#sends)            | `GET /v1/emails/{emailId}/sends` (paged)      | `sends`       |
| [`triggerInstances.list`](#triggerinstances) | `GET /v1/analytics/trigger-instances`         | `automations` |
| [`triggerInstances.get`](#triggerinstances)  | `GET /v1/analytics/trigger-instances/{id}`    | `automations` |

Every list method returns the uniform `{ data, pagination }` envelope.
`automations` and `events` additionally carry a `range`.

---

## `campaigns`

Lifetime per-campaign KPIs (sent / delivered / opened / clicked / bounced /
complained / unsubscribed) for every campaign that has actually sent. Accepts
`{ limit, cursor }` and returns `{ data, pagination }`.

```ts
const { data } = await brew.analytics.campaigns()

for (const c of data) {
  console.log(c.title, c.stats.opened, '/', c.stats.delivered)
}
```

---

## `automations`

Windowed per-automation performance + brand totals. When `from`/`to` are
omitted the API defaults to the last 30 days. Reflects LIVE runs only (test
runs never contribute). Returns `{ data, totals, range }`.

```ts
type AutomationAnalyticsInput = {
  from?: string // ISO-8601
  to?: string // ISO-8601
  automationId?: string
  limit?: number // 1–100
}

const { data, totals, range } = await brew.analytics.automations({
  from: '2026-03-01T00:00:00.000Z',
  to: '2026-04-01T00:00:00.000Z',
})

for (const a of data) {
  console.log(a.name, a.runs, a.openRate, a.clickRate)
}
```

---

## `events`

The unified event explorer across `email`, `automation`, `trigger`, and
`inbound` domains. When `from`/`to` are omitted the API defaults to the last 7
days. Returns `{ data, pagination, range }`.

Per-contact engagement is just `{ recipientEmail }`.

```ts
type EventsAnalyticsInput = {
  from?: string // ISO-8601
  to?: string // ISO-8601
  recipientEmail?: string
  eventType?: string
  automationId?: string
  sendId?: string
  limit?: number // 1–100
  cursor?: string
}

const { data, range } = await brew.analytics.events({
  recipientEmail: 'jane@example.com',
})

for (const event of data) {
  console.log(event.occurredAt, event.domain, event.eventType)
}
```

---

## `eventsAll`

Async iterator over the entire event feed — ideal for exporting a contact's
full engagement timeline without juggling the cursor.

```ts
for await (const event of brew.analytics.eventsAll({
  recipientEmail: 'jane@example.com',
})) {
  console.log(event.occurredAt, event.eventType, event.emailName)
}
```

---

## `sends`

Campaign-send **reads**. (Sending a design lives on `brew.emails.send`;
firing a test lives on `brew.emails.sendTest` — see
[`docs/emails.md`](./emails.md).)

### Shared types

```ts
type SendStatus =
  | 'scheduled'
  | 'queued'
  | 'sending'
  | 'sent'
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
  readonly emailId: string
  readonly status: SendStatus
  readonly audienceId?: string
  readonly audienceName?: string
  readonly recipientCount?: number
  readonly runId?: string
  readonly scheduledAt?: string
  readonly completedAt?: string
  readonly stats?: SendStats
  readonly createdAt: string
  readonly updatedAt: string
  // ...plus emailVersionId, subject, previewText, startedAt, failedAt, error
}
```

### `sends.list` / `sends.listAll`

List the brand's campaign sends, newest first, with lifecycle status and
aggregate `stats`. Brand-wide — there is no `emailId` filter here (use
`sends.listForEmail` for one design's history). Filters: `status`, `from`/`to`
(ISO-8601), plus `limit`/`cursor`. Returns `{ data, pagination }`.

```ts
const { data, pagination } = await brew.analytics.sends.list({
  status: 'sent',
  from: '2026-04-01T00:00:00.000Z',
  limit: 50,
})

// or page through everything:
for await (const send of brew.analytics.sends.listAll({ status: 'sent' })) {
  console.log(send.sendId, send.stats?.delivered)
}
```

### `sends.get`

Fetch a single send by id. Returns the **bare** `Send` row (not an
envelope), or `404 SEND_NOT_FOUND` on a miss. Poll this after
`brew.emails.send(...)`.

```ts
const send = await brew.analytics.sends.get({ sendId: 'snd_123' })
console.log(send.status, send.stats?.delivered)
```

### `sends.listEvents` / `sends.listAllEvents`

Per-recipient analytics event feed for one send
(`sent | delivered | opened | clicked | bounced | complained |
unsubscribed`), each with `occurredAt`, `recipientEmail`, and the click
`url` when known. Filter with `eventType`. Returns `{ data, pagination }`.

```ts
const { data } = await brew.analytics.sends.listEvents({
  sendId: 'snd_123',
  eventType: 'clicked',
})

// or page through everything:
for await (const ev of brew.analytics.sends.listAllEvents({ sendId: 'snd_123' })) {
  console.log(ev.eventType, ev.recipientEmail, ev.url)
}
```

### `sends.listForEmail` / `sends.listAllForEmail`

List one design's send history (`GET /v1/emails/{emailId}/sends`), newest
first, under `{ data, pagination }`. A design can be sent unlimited times and
each campaign send is its own `Send` row.

```ts
const { data } = await brew.analytics.sends.listForEmail({
  emailId: 'email_123',
})

for await (const send of brew.analytics.sends.listAllForEmail({
  emailId: 'email_123',
})) {
  console.log(send.sendId, send.status)
}
```

---

## `triggerInstances`

Fired-trigger instance history — one row per trigger fire (API or
integration), the derived contact, and the runs it spawned. Requires the
`automations` scope.

### `triggerInstances.list` / `triggerInstances.listAll`

Returns `{ data, pagination }`. Filter with `triggerEventId`, plus
`limit`/`cursor`.

```ts
const { data } = await brew.analytics.triggerInstances.list({
  triggerEventId: 'trig_123',
})

for await (const inst of brew.analytics.triggerInstances.listAll()) {
  console.log(inst.triggerInstanceId)
}
```

### `triggerInstances.get`

Fetch a single instance by id — returns the **bare** row, or `404` on a
miss.

```ts
const instance = await brew.analytics.triggerInstances.get({
  triggerInstanceId: 'tin_123',
})
```
