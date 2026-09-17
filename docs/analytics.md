# `brew.analytics`

Read-only analytics **reports**: brand-wide totals and timeseries,
per-automation performance, and a unified cross-domain event explorer.

| Method                        | HTTP                            | Scope         |
| ----------------------------- | ------------------------------- | ------------- |
| [`overview`](#overview)       | `GET /v1/analytics/overview`    | `emails`      |
| [`automations`](#automations) | `GET /v1/analytics/automations` | `automations` |
| [`events`](#events)           | `GET /v1/analytics/events`      | `emails`      |
| [`eventsAll`](#eventsall)     | `GET /v1/analytics/events`      | `emails`      |

> **Moved in 10.0.0.** `analytics` keeps only reports. The row reads that
> used to live here went to the resources that own them:
>
> | Was                            | Now                                     |
> | ------------------------------ | --------------------------------------- |
> | `analytics.campaigns()`        | `sends.list({ kind: 'campaign' })`      |
> | `analytics.sends.list(...)`    | `sends.list(...)` / `sends.get(sendId)` |
> | `analytics.sends.listAll(...)` | `sends.listAll(...)`                    |
> | `analytics.triggerInstances.*` | `automations.triggerInstances.*`        |
>
> See [`docs/sends.md`](./sends.md) and
> [`docs/automations.md`](./automations.md).

`events` returns the uniform `{ data, pagination }` envelope; `automations`
and `events` additionally carry a `range`.

---

## `overview`

The exact brand-wide totals, rates, and zero-filled timeseries shown in
Brew's analytics overview. Filters compose, including comma-separated source,
automation, audience, and trigger ids. A wide raw-event query can return
`truncated: true`; narrow the time window before treating that response as a
complete report.

```ts
const overview = await brew.analytics.overview({
  from: '2026-07-01T00:00:00.000Z',
  to: '2026-07-08T00:00:00.000Z',
  source: 'api,automation_manual',
  automationId: 'auto_launch',
})

console.log(overview.totals.sent, overview.rates.deliveryRate)
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

Per-contact engagement is just `{ recipient }` — the filter was
`recipientEmail` before 10.0.0.

```ts
type EventsAnalyticsInput = {
  from?: string // ISO-8601
  to?: string // ISO-8601
  recipient?: string // was `recipientEmail`
  eventType?: string
  domain?: 'email' | 'automation' | 'trigger' | 'inbound'
  source?: string
  messageClass?: 'marketing' | 'transactional'
  automationId?: string
  automationRunId?: string
  triggerEventId?: string
  audienceId?: string
  emailId?: string
  sendId?: string
  includeMachineClicks?: boolean
  includeMachineOpens?: boolean
  limit?: number // 1–100
  cursor?: string
}

const { data, range } = await brew.analytics.events({
  recipient: 'jane@example.com',
})

for (const event of data) {
  console.log(event.occurredAt, event.domain, event.eventType)
}
```

> The `recipient` rename is on the FILTER. Each returned row still carries
> the address as `recipientEmail`.

---

## `eventsAll`

Async iterator over the entire event feed — ideal for exporting a contact's
full engagement timeline without juggling the cursor.

```ts
for await (const event of brew.analytics.eventsAll({
  recipient: 'jane@example.com',
})) {
  console.log(event.occurredAt, event.eventType, event.emailName)
}
```
