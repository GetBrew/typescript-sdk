# `brew.analytics`

Read-only campaign + automation performance analytics.

| Method                        | HTTP                            | Scope         |
| ----------------------------- | ------------------------------- | ------------- |
| [`campaigns`](#campaigns)     | `GET /v1/analytics/campaigns`   | `emails`      |
| [`automations`](#automations) | `GET /v1/analytics/automations` | `automations` |

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
