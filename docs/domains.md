# `brew.domains`

List and manage sending domains. `list` returns the uniform
`{ data, pagination }` envelope; `get` returns the bare `Domain` row.

| Method                                       | HTTP                                                 |
| -------------------------------------------- | ---------------------------------------------------- |
| [`list`](#list)                              | `GET /v1/domains`                                    |
| [`get`](#get)                                | `GET /v1/domains/{domainId}`                         |
| [`health`](#health)                          | `GET /v1/domains/{domainId}/health`                  |
| [`unsubscribes.list`](#unsubscribeslist)     | `GET /v1/domains/{domainId}/unsubscribes`            |
| [`unsubscribes.add`](#unsubscribesadd)       | `POST /v1/domains/{domainId}/unsubscribes`           |
| [`unsubscribes.remove`](#unsubscribesremove) | `DELETE /v1/domains/{domainId}/unsubscribes/{email}` |
| [`unsubscribes.import`](#unsubscribesimport) | `POST /v1/domains/{domainId}/unsubscribes/import`    |
| [`unsubscribes.export`](#unsubscribesexport) | `GET /v1/domains/{domainId}/unsubscribes/export`     |

> **New in 10.0.0.** `get(domainId)` is a real route. The `domainId`
> query filter on `GET /v1/domains` is gone — it now `400`s.

> This file documents the read path used to pick a `domainId` for
> `brew.emails.send(...)` and each marketing domain's
> [unsubscribe list](#unsubscribes). The resource also exposes the
> lifecycle methods `add`, `verify`, `updateSettings`, and `delete` (each
> returns the **bare** `Domain` row).

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

```ts
const health = await brew.domains.health({ domainId: 'domain_123' })

console.log(health.score.value, health.verdict)
for (const signal of health.signals) {
  console.log(signal.severity, signal.summary, signal.suggestion)
}
```

---

## `unsubscribes`

Every **marketing** sending domain is its own unsubscribe list, keyed by
the domain's host inside the brand's contacts. A domain-level opt-out
stops mail from that host only; sends from your other marketing domains
still reach the contact. The brand-wide opt-out is `subscribed: false`
on the contact (`brew.contacts`), which blocks every marketing send.

A transactional domain owns no list: every method below answers
`422 DOMAIN_PURPOSE_NOT_ALLOWED` for one. All five need the `domains`
scope.

```ts
type DomainUnsubscribe = {
  readonly email: string
  // `domain` = on this host's list, `all` = the brand-wide opt-out, or both
  readonly scope: 'domain' | 'all' | 'both'
  readonly unsubscribedAt?: string // ISO-8601
  readonly source?: 'link' | 'one_click' | 'api' | 'import' | 'manual'
  readonly sendId?: string
}
```

### `unsubscribes.list`

One page of the list, newest first, under
`{ domainId, domainHost, data, pagination }`.

```ts
type ListDomainUnsubscribesInput = {
  readonly domainId: string
  // an address (anything with `@`) matches exactly once complete, by
  // prefix while partial; other text searches the address and contact name
  readonly q?: string
  readonly scope?: 'any' | 'domain' | 'all' // default `any`
  readonly limit?: number // 1–100, default 100
  readonly cursor?: string
}
```

```ts
const page = await brew.domains.unsubscribes.list({
  domainId: 'domain_123',
  scope: 'domain',
  q: 'jane@',
})

for (const row of page.data) {
  console.log(row.email, row.scope, row.source)
}
```

### `unsubscribes.add`

Suppress up to 1,000 addresses from **this** domain's mail. An address
with no contact is created already globally unsubscribed, so every
marketing domain skips it (`summary.created`). Addresses already on the
list count under `alreadyUnsubscribed` and never error; malformed ones
come back in `invalid` and are skipped. An `Idempotency-Key` is generated
for you; pass `options.idempotencyKey` to control it.

```ts
const result = await brew.domains.unsubscribes.add({
  domainId: 'domain_123',
  emails: ['jane@example.com', 'sam@example.com'],
})

console.log(result.summary) // { received, added, alreadyUnsubscribed, created, invalid }
```

### `unsubscribes.remove`

Take one address off **this** domain's list, resubscribing it to this
host only. The address is URL-encoded for you. Idempotent: `removed` is
`false` when the address was not on the list.

It never clears the brand-wide opt-out. `globallyUnsubscribed: true`
means every marketing send still skips the contact until you set
`subscribed: true` on it with `PATCH /v1/contacts/{email}`.

```ts
const result = await brew.domains.unsubscribes.remove(
  'domain_123',
  'jane@example.com'
)

console.log(result.removed, result.globallyUnsubscribed)
```

### `unsubscribes.import`

Migrate an unsubscribe list (another ESP's export) into this domain's
list. `csv` is the file text: an `email` header, any column of
addresses, or one headerless column. Pass `column` to name the header
when detection fails (`400` otherwise).

The call is synchronous and bounded: 10,000 rows per call (`truncated:
true` when the file carried more, so split it across calls) and
2,000,000 characters (a longer `csv` is `400 INVALID_REQUEST`). It is
idempotent per address. The contact CSV importer's `subscribed` column is
the **brand-wide** flag; use this method for per-domain opt-outs.

```ts
import { readFile } from 'node:fs/promises'

const result = await brew.domains.unsubscribes.import({
  domainId: 'domain_123',
  csv: await readFile('unsubscribes.csv', 'utf8'),
  column: 'Email Address', // optional
})

console.log(result.summary, result.truncated, result.skippedSample)
```

### `unsubscribes.export`

The whole list as CSV text (`Email,Scope,Unsubscribed At,Source,Send ID`)
inside the JSON envelope, since the v1 transport is JSON-only. Capped at
50,000 rows or about 4 MB of CSV, whichever comes first: `truncated:
true` beyond that, so narrow with `scope`.

```ts
const { csv, rowCount, truncated } = await brew.domains.unsubscribes.export({
  domainId: 'domain_123',
  scope: 'domain',
})
```
