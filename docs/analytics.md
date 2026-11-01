# `brew.analytics`

Analytics reports, trusted server event collection, and browser identity tokens.
The API key belongs on your server. Browser collection uses the separate browser
SDK and a publishable project key.

| Method                                        | HTTP                                | Scope         |
| --------------------------------------------- | ----------------------------------- | ------------- |
| [`overview`](#overview)                       | `GET /v1/analytics/overview`        | `emails`      |
| [`automations`](#automations)                 | `GET /v1/analytics/automations`     | `automations` |
| [`events`](#events)                           | `GET /v1/analytics/events`          | `emails`      |
| [`eventsAll`](#eventsall)                     | `GET /v1/analytics/events`          | `emails`      |
| [`eventCounts`](#eventcounts)                 | `GET /v1/analytics/events`          | `emails`      |
| [`track`](#track)                             | `POST /v1/analytics/track`          | `automations` |
| [`createIdentityToken`](#createidentitytoken) | `POST /v1/analytics/identity-token` | `contacts`    |

> **Moved in 10.0.0.** The row reads that
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

---

## `eventCounts`

Counts of the email events the same filters list, instead of the rows: per
one or two fields (`groupBy`), per UTC `day`, `week` or `month` (`bucket`),
or both. Returns `count`, the largest 200 `groups` (`key` maps each field
to its value, `bucket` is the ISO period start), `otherCount` for the rest,
`range`, and `truncated` with `coveredFrom` when the window held more than
the newest 20,000 events. It counts events, not unique recipients.

```ts
// Clicks per link on one send.
const perLink = await brew.analytics.eventCounts({
  sendId: 'snd_123',
  eventType: 'clicked',
  groupBy: ['link'],
})

// Events per type per day, last week.
const perDay = await brew.analytics.eventCounts({
  groupBy: ['eventType'],
  bucket: 'day',
})

// Unsubscribes per stated reason.
const reasons = await brew.analytics.eventCounts({
  groupBy: ['unsubscribeReason'],
})
```

`groupBy` takes `eventType`, `emailId`, `automationId`, `sendId`,
`source`, `link`, `recipientDomain` or `unsubscribeReason`
(`EVENTS_GROUP_BY_TOKENS`). A count takes no `cursor` or `limit`.

---

## `track`

`track(input: TrackProductAnalyticsInput, options?: RequestOptions)` submits
up to 50 canonical product events. It returns `TrackProductAnalyticsResponse`:
`{ accepted: string[], rejected: Array<{ id, reason }> }`.

```ts
const result = await brew.analytics.track(
  {
    projectId: 'pap_project',
    events: [
      {
        schemaVersion: 1,
        id: 'order-123-completed',
        type: 'track',
        name: 'order_completed',
        occurredAt: new Date().toISOString(),
        anonymousId: 'browser-anonymous-id',
        userId: 'user-123',
        sessionId: 'browser-session-id',
        tabId: 'server',
        pageViewId: 'server',
        properties: { orderId: 'order-123', total: 4900 },
        context: {},
        sdk: { name: 'orders-service', version: '1.0.0' },
      },
    ],
  },
  { idempotencyKey: 'order-123-completed' }
)

if (result.rejected.length > 0) {
  console.error('Rejected analytics events', result.rejected)
}
```

Requires the `automations` API scope. The project must belong to the selected
brand; an organization-scoped key selects it using `brandId` in the client
configuration or `brew.withBrand(brandId)`. The server derives tenant ownership
and trust from that verified scope. Never put your API key in a browser bundle.

The batch limit is 48 KiB including the server transport envelope; each event is
limited to 8 KiB. Keep IDs stable when
retrying the same upstream job. HTTP 202 acknowledges durable ingestion; it does
not mean a trigger or flow has finished. Explicitly inspect `rejected` even after
a successful request. Existing transport retries and typed errors apply; passing
`{ raw: true }` returns `BrewRawResponse<TrackProductAnalyticsResponse>`.

## `createIdentityToken`

`createIdentityToken(input: CreateProductAnalyticsIdentityTokenInput,
options?: RequestOptions)` returns
`CreateProductAnalyticsIdentityTokenResponse`: `{ token, expiresAt }`.

```ts
const identity = await brew.analytics.createIdentityToken({
  projectId: 'pap_project',
  userId: 'user-123',
  anonymousId: 'browser-anonymous-id',
  contactId: '507f1f77bcf86cd799439011',
})
```

Requires the `contacts` scope. Call from your application backend only after
authenticating the current user and resolving that user's existing contact.
The browser must not choose arbitrary contact IDs. Brew checks the contact and
project belong to the credential's selected brand, then signs a token binding
the anonymous ID, application user, contact, project, environment, and region.

Return this token to that user's browser SDK. It expires after five minutes;
refresh it through your authenticated backend before expiry. This endpoint does
not replay cached Idempotency-Key responses, which could contain expired tokens.
It never creates a contact, changes subscription status, or grants marketing
consent. A missing or other-brand project/contact returns `404 NOT_FOUND`.
