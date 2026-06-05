# `brew.analytics`

Read-only campaign + automation analytics, plus a unified cross-domain event
explorer.

| Method                        | HTTP                            | Scope         |
| ----------------------------- | ------------------------------- | ------------- |
| [`campaigns`](#campaigns)     | `GET /v1/analytics/campaigns`   | `emails`      |
| [`automations`](#automations) | `GET /v1/analytics/automations` | `automations` |
| [`events`](#events)           | `GET /v1/analytics/events`      | `emails`      |
| [`eventsAll`](#eventsall)     | `GET /v1/analytics/events`      | `emails`      |

`campaigns` accepts `{ limit, cursor }` and returns `{ campaigns, pagination }`.

---

## `campaigns`

Lifetime per-campaign KPIs (sent / delivered / opened / clicked / bounced /
complained / unsubscribed) for every campaign that has actually sent.

```ts
const { campaigns } = await brew.analytics.campaigns()

for (const c of campaigns) {
  console.log(c.title, c.stats.opened, '/', c.stats.delivered)
}
```

---

## `automations`

Windowed per-automation performance + brand totals. When `from`/`to` are
omitted the API defaults to the last 30 days. Reflects LIVE runs only (test
runs never contribute).

```ts
type AutomationAnalyticsInput = {
  from?: string // ISO-8601
  to?: string // ISO-8601
  automationId?: string
  limit?: number // 1–100
}

const { automations, totals, range } = await brew.analytics.automations({
  from: '2026-03-01T00:00:00.000Z',
  to: '2026-04-01T00:00:00.000Z',
})

for (const a of automations) {
  console.log(a.name, a.runs, a.openRate, a.clickRate)
}
```

---

## `events`

The unified event explorer across `email`, `automation`, `trigger`, and
`inbound` domains. When `from`/`to` are omitted the API defaults to the last 7
days. Returns `{ events, pagination, range }`.

Per-contact engagement is just `{ recipientEmail }`.

```ts
type EventsAnalyticsInput = {
  from?: string // ISO-8601
  to?: string // ISO-8601
  recipientEmail?: string
  eventType?: string
  automationId?: string
  limit?: number // 1–100
  cursor?: string
}

const { events, range } = await brew.analytics.events({
  recipientEmail: 'jane@example.com',
})

for (const event of events) {
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
