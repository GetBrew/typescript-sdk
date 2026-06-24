# `brew.domains`

List and manage sending domains. `list` returns the uniform
`{ data, pagination }` envelope.

| Method                          | HTTP                              |
| ------------------------------- | --------------------------------- |
| [`list`](#list)                 | `GET /v1/domains`                 |
| [`listSendable`](#listsendable) | `GET /v1/domains?sendableOnly=true` |

> This file documents the read paths used to pick a `domainId` for
> `brew.sends.create(...)`. The resource also exposes the lifecycle
> methods `get`, `add`, `verify`, `updateSettings`, and `delete` (each
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

List **all** sending domains for the current organization — including
`pending` rows and their DNS `records` (so lifecycle callers can finish
verification). Each row carries `status` and the derived `sendable` flag.
Returns `{ data, pagination }`; accepts `{ limit, cursor }`.

```ts
const { data } = await brew.domains.list()

for (const domain of data) {
  console.log(domain.domainId, domain.domainUrl, domain.status)
}
```

---

## `listSendable`

Only the verified, send-ready domains — the safe source for `domainId`
when you call `brew.sends.create(...)`. Returns `{ data, pagination }`.

```ts
const { data } = await brew.domains.listSendable()

for (const domain of data) {
  console.log(domain.domainId, domain.domainUrl) // every row has sendable: true
}
```

You can also filter `list()` on `row.sendable` to get the same set.
