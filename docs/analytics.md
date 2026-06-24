# `brew.analytics`

Read-only campaign + automation analytics, a unified cross-domain event
explorer, the campaign-send reads (`analytics.sends.*`), and the
fired-trigger instance history (`analytics.triggerInstances.*`).

| Method                                          | HTTP                                          | Scope         |
| ----------------------------------------------- | --------------------------------------------- | ------------- |
| [`campaigns`](#campaigns)                       | `GET /v1/analytics/campaigns`                 | `emails`      |
| [`automations`](#automations)                   | `GET /v1/analytics/automations`               | `automations` |
| [`events`](#events)                             | `GET /v1/analytics/events`                    | `emails`      |
| [`eventsAll`](#eventsall)                       | `GET /v1/analytics/events`                    | `emails`      |
| [`sends.list`](#sends)                          | `GET /v1/analytics/sends`                     | `sends`       |
| [`sends.listAll`](#sends)                       | `GET /v1/analytics/sends` (paged)             | `sends`       |
| [`triggerInstances.list`](#triggerinstances)    | `GET /v1/analytics/trigger-instances`         | `automations` |
| [`triggerInstances.listAll`](#triggerinstances) | `GET /v1/analytics/trigger-instances` (paged) | `automations` |

Reads are flat — one read per resource, identity in the query (`?<id>`),
`?include` for opt-in expansions. Every list method returns the uniform
`{ data, pagination? }` envelope (detail mode = a single-row page
`{ data: [row] }`, no `pagination`). `automations` and `events`
additionally carry a `range`.

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

Campaign-send **reads** — one flat read. (Sending a design lives on the
single polymorphic `brew.emails.send`, campaign or test via `test: true`
— see [`docs/emails.md`](./emails.md).)

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
  // ...plus emailVersionId, subject, previewText, startedAt, failedAt, error.
  // In detail mode with `?include=events`, a bounded first page of the
  // send's per-recipient analytics `events[]` is inlined on the row.
}
```

### `sends.list` / `sends.listAll`

The single sends read. Reads are flat — the identity lives in the query.

- **List mode** (no `sendId`): the brand's sends, newest first, with
  lifecycle status and aggregate `stats`. Narrow to one design's history
  with `emailId` (mutually exclusive with `sendId`). Filters: `status`,
  `from`/`to` (ISO-8601), plus `limit`/`cursor`. Returns
  `{ data, pagination }`.
- **Detail mode** (`sendId` set): a single-row page `{ data: [row] }` with
  no `pagination`. Add `include: 'events'` for a bounded first page of the
  send's per-recipient analytics events inlined on the row (an `include`
  without `sendId` is `400 INVALID_REQUEST`).

```ts
// List mode (filter, page):
const { data, pagination } = await brew.analytics.sends.list({
  status: 'sent',
  from: '2026-04-01T00:00:00.000Z',
  limit: 50,
})

// One design's history:
const forEmail = await brew.analytics.sends.list({ emailId: 'email_123' })

// Detail mode + inline events:
const detail = await brew.analytics.sends.list({
  sendId: 'snd_123',
  include: 'events',
})
const send = detail.data[0]
console.log(send?.status, send?.events?.length)

// Or page through everything:
for await (const s of brew.analytics.sends.listAll({ status: 'sent' })) {
  console.log(s.sendId, s.stats?.delivered)
}
```

---

## `triggerInstances`

Fired-trigger instance history — one row per trigger fire (API or
integration), the derived contact, and the runs it spawned. Requires the
`automations` scope.

### `triggerInstances.list` / `triggerInstances.listAll`

The single fired-trigger read. Reads are flat — the identity lives in the
query.

- **List mode** (no `triggerInstanceId`): the audit log of every inbound
  fire, newest first. Filter with `triggerEventId`, plus `limit`/`cursor`.
  Returns `{ data, pagination }`.
- **Detail mode** (`triggerInstanceId` set): a single-row page
  `{ data: [row] }` with no `pagination`.

```ts
// List mode:
const { data } = await brew.analytics.triggerInstances.list({
  triggerEventId: 'trig_123',
})

// Detail mode (one instance):
const detail = await brew.analytics.triggerInstances.list({
  triggerInstanceId: 'tin_123',
})
console.log(detail.data[0]?.triggerInstanceId)

// Or page through everything:
for await (const inst of brew.analytics.triggerInstances.listAll()) {
  console.log(inst.triggerInstanceId)
}
```
