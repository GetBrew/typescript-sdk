# `brew.domains`

List and manage sending domains. `list` returns the uniform
`{ data, pagination }` envelope; `get` returns the bare `Domain` row.

| Method                          | HTTP                                  |
| ------------------------------- | ------------------------------------- |
| [`list`](#list)                 | `GET /v1/domains`                     |
| [`get`](#get)                   | `GET /v1/domains/{domainId}`          |
| [`health`](#health)             | `GET /v1/domains/{domainId}/health`   |
| [`unsubscribes`](#unsubscribes) | `/v1/domains/{domainId}/unsubscribes` |

> **New in 10.0.0.** `get(domainId)` is a real route. The `domainId`
> query filter on `GET /v1/domains` is gone — it now `400`s.

> This file documents the single read path used to pick a `domainId`
> for `brew.emails.send(...)`. The resource also exposes the lifecycle
> methods `add`, `verify`, `updateSettings`, and `delete` (each returns
> the **bare** `Domain` row).

## Shared types

```ts
type DomainStatus =
  | 'not_started'
  | 'pending'
  | 'verified'
  | 'failed'
  | 'temporary_failure'
  | 'partially_verified'
  | 'partially_failed'

type Domain = {
  readonly domainId: string
  readonly domainUrl: string
  readonly name: string
  readonly region: string
  readonly status: DomainStatus
  readonly sendingEnabled: boolean
  readonly sendable: boolean // verified + send-ready
  readonly records: ReadonlyArray<{
    record: string
    name: string
    type: string
    ttl: string
    status: string
    value: string
    priority?: number
  }>
  readonly createdAt: string // ISO-8601
  readonly updatedAt: string // ISO-8601
  // ...plus openTracking, clickTracking, verifiedAt
}
```

---

## `list`

**All** sending domains for the current organization, including `pending`
rows and their DNS `records` (so lifecycle callers can finish
verification). Each row carries `status` and the derived `sendable` flag.

Pass `sendableOnly: true` to narrow to verified, send-ready domains — the
safe source for a `domainId` when you call `brew.emails.send(...)` — and
`sendingPurpose` to narrow to domains cleared for marketing or
transactional mail.

```ts
type ListDomainsInput = {
  readonly sendableOnly?: boolean
  readonly sendingPurpose?: 'marketing' | 'transactional'
  readonly limit?: number
  readonly cursor?: string
}
```

List every domain:

```ts
const { data } = await brew.domains.list()

for (const domain of data) {
  console.log(domain.domainId, domain.domainUrl, domain.status)
}
```

Only the verified, send-ready domains:

```ts
const { data } = await brew.domains.list({ sendableOnly: true })

for (const domain of data) {
  console.log(domain.domainId, domain.domainUrl) // every row has sendable: true
}
```

---

## `get`

One domain, as the bare row. An unknown or cross-organization id is
`404 DOMAIN_NOT_FOUND`.

```ts
const domain = await brew.domains.get('domain_123')
console.log(domain.status, domain.sendable, domain.records)
```

---

## `health`

Returns one aggregate deliverability report: score and verdict, SPF/DKIM/DMARC,
tracking posture, active gradual sends, recent volume, bounce and complaint
signals, workspace reputation, recent inbox-placement tests, and prioritized
remediation signals.

`domainActivity` includes up to 25 sends on this domain from the brand's
newest 100 campaign and 100 automation sends, excluding placement seeds.
Event automation rows can cover one recipient; audience-run automation and
campaign rows can cover many. It is a sample, not a time-window total.

```ts
const health = await brew.domains.health({ domainId: 'domain_123' })

console.log(health.score.value, health.verdict)
for (const signal of health.signals) {
  console.log(signal.severity, signal.summary, signal.suggestion)
}
```

`include` adds the score's history. New in 11.6.0.

| Token            | Key            | What it is                                                                                                                                        |
| ---------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'scoreHistory'` | `scoreHistory` | Up to 50 saved score snapshots, newest first: `score`, `grade`, `confidence`, the event that saved it (`trigger`), and each pillar's score/weight |
| `'scoreRuns'`    | `scoreRuns`    | The last 5 automated domain score runs: `status`, the score it ended on (`scoreAfter`), `creditsCharged`, and every variant's placement test      |

```ts
const health = await brew.domains.health({
  domainId: 'domain_123',
  include: ['scoreHistory', 'scoreRuns'],
})

for (const snapshot of health.scoreHistory ?? []) {
  console.log(snapshot.computedAt, snapshot.score, snapshot.trigger)
}
const lastRun = health.scoreRuns?.[0]
console.log(lastRun?.status, lastRun?.scoreAfter?.grade)
```

Only snapshots saved under this brand count, and they are searched among
the domain's newest 500, so a domain that moved between brands can show
fewer than 50.

Errors: `404 DOMAIN_NOT_FOUND` for an unknown domain, and
`400 INVALID_REQUEST` for an unknown `include` token.

---

## `unsubscribes`

Every marketing domain keeps its own unsubscribe list. `add` and `import`
suppress addresses from THIS domain's mail only (sends from the brand's other
marketing domains still reach them); an address with no contact is created
unsubscribed brand-wide. `remove` never re-subscribes a brand-wide opt-out.
A transactional domain has no list (`422 DOMAIN_PURPOSE_NOT_ALLOWED`).

```ts
await brew.domains.unsubscribes.add(
  { domainId: 'domain_123', emails: ['ada@example.com'] },
  { idempotencyKey: 'suppress-ada' }
)

const page = await brew.domains.unsubscribes.list({
  domainId: 'domain_123',
  scope: 'domain', // 'any' | 'domain' | 'all'
})

await brew.domains.unsubscribes.import({
  domainId: 'domain_123',
  csv: 'Email\nada@example.com\nbo@example.com',
  column: 'Email',
})

const { csv } = await brew.domains.unsubscribes.export({
  domainId: 'domain_123',
  scope: 'any',
})

await brew.domains.unsubscribes.remove({
  domainId: 'domain_123',
  email: 'ada@example.com',
})
```
