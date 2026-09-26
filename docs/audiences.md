# `brew.audiences`

Full CRUD for saved audiences (named filter sets over the brand's contacts).
An audience is the recipient target for `brew.emails.send(...)`.

| Method                      | HTTP                                        |
| --------------------------- | ------------------------------------------- |
| [`list`](#list)             | `GET /v1/audiences`                         |
| [`get`](#get)               | `GET /v1/audiences/{audienceId}`            |
| [`create`](#create)         | `POST /v1/audiences`                        |
| [`fromEvents`](#fromevents) | `POST /v1/audiences/from-events`            |
| [`duplicate`](#duplicate)   | `POST /v1/audiences/{audienceId}/duplicate` |
| [`update`](#update)         | `PATCH /v1/audiences/{audienceId}`          |
| [`delete`](#delete)         | `DELETE /v1/audiences/{audienceId}`         |

> **New in 10.0.0.** `get(audienceId)` is a real route returning the bare
> row. The `audienceId` and `include` query filters on `GET /v1/audiences`
> are gone — they now `400`.

## Shared types

```ts
type Audience = {
  readonly audienceId: string
  readonly audienceName: string
  readonly filters: {
    readonly filters: ReadonlyArray<{
      field: string
      operator: string
      value?: unknown
      type?: string
    }>
    readonly logicalOperator: 'and' | 'or'
  }
  readonly count: number
  readonly createdAt: string // ISO-8601
  readonly updatedAt: string // ISO-8601
}
```

`list` returns the uniform `{ data, pagination }` envelope. `get`,
`create`, and `update` all return the **bare** `Audience` row.

---

## `list`

Every saved audience for the brand, under `{ data, pagination }`. Accepts
`{ limit, cursor }`.

```ts
type ListAudiencesInput = {
  readonly search?: string // name contains, case-insensitive
  readonly limit?: number
  readonly cursor?: string
}

const { data } = await brew.audiences.list()
for (const audience of data) {
  console.log(audience.audienceId, audience.count)
}

const { data: matches } = await brew.audiences.list({ search: 'founders' })
```

## `get`

One audience, as the bare row. An unknown or cross-brand id is
`404 AUDIENCE_NOT_FOUND` — no more reading `data[0]` and testing for
emptiness.

```ts
const audience = await brew.audiences.get(audienceId)
console.log(audience.audienceName, audience.count)
```

Add `include: 'count'` (or `['count']`) to make the row's `count` the
**authoritative**, freshly computed live member total — the size a campaign
send would target. Without it, `count` reflects the cached value, which reads
`0` until a cache writer populates it.

```ts
const audience = await brew.audiences.get(audienceId, { include: 'count' })
console.log(audience.count) // live member total
```

Add `'build'` for an audience made by `brew.audiences.fromEvents(...)`: the
row gains `build`, its latest cohort build (`jobId`, `status`, `cohort`).

```ts
const audience = await brew.audiences.get(audienceId, {
  include: ['count', 'build'],
})
console.log(audience.build?.status) // queued | running | completed | ...
```

## `create`

Returns the created row (`AudienceWriteResult`). When the filters carry an
`email in [...]` list of more than 100 addresses, the list is stored as a
snapshot of the matching contacts in a custom field, and
`emailListMaterializations` reports each one (`fieldName`,
`providedEmails`, `matchedContacts`).

```ts
const audience = await brew.audiences.create({
  name: 'Nordic Founders',
  filters: {
    filters: [{ field: 'country', operator: 'equals', value: 'NO' }],
    logicalOperator: 'and',
  },
})
```

## `update`

Pass `audienceId` plus at least one of `name`, `filters`, `addEmails` or
`removeEmails`. Returns the updated row (`AudienceWriteResult`).

```ts
const updated = await brew.audiences.update({ audienceId, name: 'EU Founders' })
```

Add or remove specific contacts by email instead of rewriting `filters`
(pass one or the other, not both). The response's `membership` reports
what happened to each address: `added`, `alreadyPresent`, `unExcluded`,
`removedFromList`, `excludedByFilter`, `notAMember`, and `noContactYet`
for an added address with no contact yet (it matches nobody until the
contact exists).

```ts
const { membership } = await brew.audiences.update({
  audienceId,
  addEmails: ['ada@example.com'],
  removeEmails: ['old@example.com'],
})
console.log(membership?.added, membership?.noContactYet)
```

An edit the audience's filters cannot express exactly is refused with
`409 AUDIENCE_MEMBERSHIP_NOT_EXPRESSIBLE`, and nothing is written.

## `fromEvents`

Creates a frozen audience snapshot from a bounded analytics-event cohort. The
response includes the asynchronous materialization build state.

```ts
const audience = await brew.audiences.fromEvents({
  name: 'Recent openers',
  cohort: { eventTypes: ['opened'], from: '2026-08-01T00:00:00.000Z' },
})
```

## `duplicate`

Copies a saved segment into an independent audience.

```ts
const copy = await brew.audiences.duplicate({ audienceId })
```

## `delete`

Idempotent — an unknown id resolves with `{ deleted: false }`.

```ts
const { deleted } = await brew.audiences.delete({ audienceId })
```
