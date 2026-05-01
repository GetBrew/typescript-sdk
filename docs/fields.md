# `brew.fields`

Three methods for managing the custom-field schema attached to
contacts. Custom fields let you store arbitrary structured data on
each contact (plan, signup date, lifetime value, etc.).

| Method              | HTTP                |
| ------------------- | ------------------- |
| [`list`](#list)     | `GET /v1/fields`    |
| [`create`](#create) | `POST /v1/fields`   |
| [`delete`](#delete) | `DELETE /v1/fields` |

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

type FieldsSuccessResponse = {
  readonly success: true
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
type ListFieldsResponse = {
  readonly fields: ReadonlyArray<ContactField>
}

list(): Promise<ListFieldsResponse>
```

```ts
const { fields } = await brew.fields.list()

const customOnly = fields.filter((field) => field.isCore !== true)
for (const field of customOnly) {
  console.log(`${field.fieldName} (${field.fieldType})`)
}
```

The full envelope (not just the array) is returned so the API can
grow metadata like pagination later without a breaking change.

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
): Promise<FieldsSuccessResponse>
```

```ts
await brew.fields.create({ fieldName: 'plan', fieldType: 'string' })
await brew.fields.create({ fieldName: 'signupDate', fieldType: 'date' })
await brew.fields.create({ fieldName: 'lifetimeValue', fieldType: 'number' })
await brew.fields.create({ fieldName: 'isVip', fieldType: 'bool' })
```

POST requests get an auto-generated `Idempotency-Key`, so retrying a
transient failure is safe. `POST /v1/fields` is upsert-shaped: a
duplicate create for the same `fieldName` returns `200 { success: true }`
instead of throwing, so it is safe to call this method to lazily ensure
a custom field exists.

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
): Promise<FieldsSuccessResponse>
```

```ts
await brew.fields.delete({ fieldName: 'plan' })
```

DELETE retries on transient failures by default. Re-deleting a field
that no longer exists is safe — the server treats it as success.
