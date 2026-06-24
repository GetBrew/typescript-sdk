# `brew.audiences`

Full CRUD for saved audiences (named filter sets over the brand's contacts).
An audience is the recipient target for `brew.emails.send(...)`.

Reads are flat — one read per resource, identity in the query
(`?audienceId`), `?include` for opt-in expansions; writes are path-based.
Detail mode = pass the id key → a single-row page `{ data: [row] }`, no
`pagination`.

| Method              | HTTP                                |
| ------------------- | ----------------------------------- |
| [`list`](#list)     | `GET /v1/audiences`                 |
| [`create`](#create) | `POST /v1/audiences`                |
| [`update`](#update) | `PATCH /v1/audiences/{audienceId}`  |
| [`delete`](#delete) | `DELETE /v1/audiences/{audienceId}` |

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

In list mode `list` returns the uniform `{ data, pagination }` envelope; in
detail mode it returns a single-row page `{ data: [row] }` with no
`pagination`. `create` and `update` return the **bare** `Audience` row.

---

## `list`

The single audiences read. Omit `audienceId` → list all audiences,
returning `{ data, pagination }`; accepts `{ limit, cursor }`. Pass
`audienceId` → a single-row page `{ data: [row] }`. `include` is
detail-only and **requires** `audienceId`; it accepts `'count'` as an
array or a comma-separated string. This one method replaces the old
`audiences.get` read.

```ts
type ListAudiencesInput = {
  readonly audienceId?: string
  readonly include?: ReadonlyArray<'count'> | string // detail-only
  readonly limit?: number
  readonly cursor?: string
}
```

List mode:

```ts
const { data } = await brew.audiences.list()
for (const audience of data) {
  console.log(audience.audienceId, audience.count)
}
```

Detail mode — pass the `audienceId` key and read `data[0]`. The result is
empty (`data: []`) on a miss:

```ts
const { data } = await brew.audiences.list({ audienceId })
const audience = data[0]
console.log(audience.audienceName, audience.count)
```

Add `include: 'count'` (or `['count']`) to make the row's `count` the
**authoritative**, freshly computed live member total — the size a campaign
send would target. Without it, `count` reflects the cached value, which reads
`0` until a cache writer populates it.

```ts
const { data } = await brew.audiences.list({ audienceId, include: 'count' })
console.log(data[0].count) // live member total
```

## `create`

Returns the created `Audience` row.

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

Pass `audienceId` plus at least one of `name` / `filters`. Returns the
updated `Audience` row.

```ts
const updated = await brew.audiences.update({ audienceId, name: 'EU Founders' })
```

## `delete`

Idempotent — an unknown id resolves with `{ deleted: false }`.

```ts
const { deleted } = await brew.audiences.delete({ audienceId })
```
