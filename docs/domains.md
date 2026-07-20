# `brew.domains`

List and manage sending domains. Reads are flat — one read per resource,
identity in the query (`?domainId`); writes are path-based. In list mode
`list` returns the uniform `{ data, pagination }` envelope; in detail
mode it returns a single-row page `{ data: [row] }` with no `pagination`.

| Method              | HTTP                                |
| ------------------- | ----------------------------------- |
| [`list`](#list)     | `GET /v1/domains`                   |
| [`health`](#health) | `GET /v1/domains/{domainId}/health` |

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

The single domains read. Omit `domainId` → list **all** sending domains
for the current organization, including `pending` rows and their DNS
`records` (so lifecycle callers can finish verification). Each row carries
`status` and the derived `sendable` flag. Pass `sendableOnly: true` to
narrow the list to verified, send-ready domains — the safe source for a
`domainId` when you call `brew.emails.send(...)`. Pass `domainId` → a
single-row page `{ data: [row] }`. This one method replaces both the old
`domains.get` read and the old separate list-sendable method.

```ts
type ListDomainsInput = {
  readonly domainId?: string
  readonly sendableOnly?: boolean
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

Look one domain up by id — the result is a single-row page, so read
`data[0]`:

```ts
const { data } = await brew.domains.list({ domainId: 'domain_123' })
const domain = data[0]
console.log(domain.status, domain.records)
```

---

## `health`

Returns one aggregate deliverability report: score and verdict, SPF/DKIM/DMARC,
tracking posture, active gradual sends, recent volume, bounce and complaint
signals, workspace reputation, recent inbox-placement tests, and prioritized
remediation signals.

```ts
const health = await brew.domains.health({ domainId: 'domain_123' })

console.log(health.score.value, health.verdict)
for (const signal of health.signals) {
  console.log(signal.severity, signal.summary, signal.suggestion)
}
```
