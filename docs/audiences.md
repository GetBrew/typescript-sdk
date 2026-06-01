# `brew.audiences`

Full CRUD for saved audiences (named filter sets over the brand's contacts).
An audience is the recipient target for `brew.sends.create(...)`.

| Method                    | HTTP                             |
| ------------------------- | -------------------------------- |
| [`list`](#list)           | `GET /v1/audiences`              |
| [`get`](#get)             | `GET /v1/audiences?audienceId=…` |
| [`create`](#create)       | `POST /v1/audiences`             |
| [`duplicate`](#duplicate) | `POST /v1/audiences`             |
| [`update`](#update)       | `PATCH /v1/audiences`            |
| [`delete`](#delete)       | `DELETE /v1/audiences`           |

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

Every read AND write returns the uniform `{ audiences: Audience[] }` envelope
(single fetch + create/update return a one-element array).

---

## `list`

```ts
const { audiences } = await brew.audiences.list()
```

## `get`

```ts
const { audiences } = await brew.audiences.get({ audienceId })
const audience = audiences[0] // or 404 AUDIENCE_NOT_FOUND
```

## `create`

```ts
const { audiences } = await brew.audiences.create({
  name: 'Nordic Founders',
  filters: {
    filters: [{ field: 'country', operator: 'equals', value: 'NO' }],
    logicalOperator: 'and',
  },
})
```

## `duplicate`

```ts
const { audiences } = await brew.audiences.duplicate({
  duplicateFrom: audienceId,
})
```

## `update`

```ts
await brew.audiences.update({ audienceId, name: 'EU Founders' })
```

## `delete`

Idempotent — an unknown id resolves with `{ deleted: false }`.

```ts
const { deleted } = await brew.audiences.delete({ audienceId })
```
