# `brew.audiences`

Full CRUD for saved audiences (named filter sets over the brand's contacts).
An audience is the recipient target for `brew.emails.send(...)`.

| Method                    | HTTP                                       |
| ------------------------- | ------------------------------------------ |
| [`list`](#list)           | `GET /v1/audiences`                        |
| [`get`](#get)             | `GET /v1/audiences/{audienceId}`           |
| [`getCount`](#getcount)   | `GET /v1/audiences/{audienceId}/count`     |
| [`create`](#create)       | `POST /v1/audiences`                       |
| [`duplicate`](#duplicate) | `POST /v1/audiences/{audienceId}/duplicate` |
| [`update`](#update)       | `PATCH /v1/audiences/{audienceId}`         |
| [`delete`](#delete)       | `DELETE /v1/audiences/{audienceId}`        |

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
`create`, `duplicate`, and `update` return the **bare** `Audience` row.

---

## `list`

Returns `{ data, pagination }`; accepts `{ limit, cursor }`.

```ts
const { data } = await brew.audiences.list()
for (const audience of data) {
  console.log(audience.audienceId, audience.count)
}
```

## `get`

Returns the bare `Audience` row, or `404 AUDIENCE_NOT_FOUND` on a miss.

```ts
const audience = await brew.audiences.get({ audienceId })
console.log(audience.audienceName, audience.count)
```

## `getCount`

Fetch a fresh member count for one audience — `{ audienceId, count }`.

```ts
const { count } = await brew.audiences.getCount({ audienceId })
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

## `duplicate`

Clones an existing audience (name suffixed `" (copy)"`). Returns the
duplicated `Audience` row.

```ts
const copy = await brew.audiences.duplicate({ audienceId })
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
