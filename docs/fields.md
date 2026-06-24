# `brew.fields`

Three methods for managing the custom-field schema attached to
contacts. Custom fields let you store arbitrary structured data on
each contact (plan, signup date, lifetime value, etc.).

| Method              | HTTP                            |
| ------------------- | ------------------------------- |
| [`list`](#list)     | `GET /v1/fields`                |
| [`create`](#create) | `POST /v1/fields`               |
| [`delete`](#delete) | `DELETE /v1/fields/{fieldName}` |

## Shared types

```ts
type ContactFieldType = 'string' | 'number' | 'date' | 'bool'

type ContactField = {
  readonly fieldName: string
  readonly fieldType: ContactFieldType
  readonly label?: string
  readonly isCore?: boolean
  readonly isFilterable?: boolean
  readonly isSortable?: boolean
  readonly isSearchable?: boolean
}

type FieldsDeleteResponse = {
  readonly fieldName: string
  readonly deleted: boolean
}
```

> **Two naming heads-ups**:
>
> - The wire field is `fieldName`, **not** `name`.
> - The boolean type is `'bool'`, **not** `'boolean'`. There is no
>   `'array'` type.
>
> Both are pinned to the public API contract — the SDK mirrors the
> wire vocabulary exactly so the type system stops you from sending
> something the server will reject.

`isCore: true` distinguishes built-in fields (the ones every contact
has — `email`, `firstName`, etc.) from organization-defined custom
fields. Filter/sort/search flags describe what operations the field
supports.

---

## `list`

List every contact field definition (both core and custom).

```ts
type ListFieldsInput = {
  readonly limit?: number // 1–100, default 100
  readonly cursor?: string
}

type FieldsGetResponse = {
  readonly data: ReadonlyArray<ContactField>
  readonly pagination: {
    readonly limit: number
    readonly cursor: string | null
    readonly hasMore: boolean
  }
}

list(input?: ListFieldsInput): Promise<FieldsGetResponse>
```

```ts
const { data } = await brew.fields.list()

const customOnly = data.filter((field) => field.isCore !== true)
for (const field of customOnly) {
  console.log(`${field.fieldName} (${field.fieldType})`)
}
```

The uniform `{ data, pagination }` envelope is returned — page with
`limit` and the opaque `cursor` echoed from `pagination.cursor`.

---

## `create`

Define a new custom field on the contacts schema.

```ts
type CreateFieldInput = {
  readonly fieldName: string
  readonly fieldType: ContactFieldType
}

create(
  input: CreateFieldInput,
  options?: RequestOptions
): Promise<ContactField>
```

```ts
await brew.fields.create({ fieldName: 'plan', fieldType: 'string' })
await brew.fields.create({ fieldName: 'signupDate', fieldType: 'date' })
await brew.fields.create({ fieldName: 'lifetimeValue', fieldType: 'number' })
await brew.fields.create({ fieldName: 'isVip', fieldType: 'bool' })
```

POST requests get an auto-generated `Idempotency-Key`, so retrying a
transient failure is safe. `POST /v1/fields` is upsert-shaped: a
duplicate create for the same `fieldName` returns the existing field
definition instead of throwing, so it is safe to call this method to
lazily ensure a custom field exists. The created/updated field
definition is returned bare (no wrapping envelope).

The only validation failure surfaced as a `BrewApiError` here is
`422 CORE_FIELD_IMMUTABLE` (when `fieldName` collides with a
built-in core field like `email` or `firstName`).

---

## `delete`

Remove a custom field from the contacts schema. **Destructive**: this
drops the column from every existing contact.

```ts
type DeleteFieldInput = { readonly fieldName: string }

delete(
  input: DeleteFieldInput,
  options?: RequestOptions
): Promise<FieldsDeleteResponse>
```

```ts
const { deleted } = await brew.fields.delete({ fieldName: 'plan' })
```

DELETE retries on transient failures by default. Re-deleting a field
that no longer exists is safe — the server resolves with
`{ fieldName, deleted: false }` rather than throwing.
