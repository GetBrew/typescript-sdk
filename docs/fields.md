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
type ContactFieldType = 'string' | 'number' | 'boolean' | 'date' | 'array'

type ContactField = {
  readonly name: string
  readonly type: ContactFieldType
  readonly createdAt?: string
}

type FieldsSuccessResponse = {
  readonly success: true
}
```

The supported field types are pinned to the public API contract — adding
a type to the union here without server support would let callers write
code that 422s at runtime.

---

## `list`

List every custom field defined on the contacts schema.

```ts
type ListFieldsResponse = {
  readonly fields: ReadonlyArray<ContactField>
}

list(): Promise<ListFieldsResponse>
```

```ts
const { fields } = await brew.fields.list()

for (const field of fields) {
  console.log(field.name, field.type)
}
```

The full envelope (not just the array) is returned so the API can grow
metadata like pagination later without a breaking change.

---

## `create`

Define a new custom field on the contacts schema.

```ts
type CreateFieldInput = {
  readonly name: string
  readonly type: ContactFieldType
}

create(
  input: CreateFieldInput,
  options?: RequestOptions
): Promise<FieldsSuccessResponse>
```

```ts
await brew.fields.create({ name: 'plan', type: 'string' })
await brew.fields.create({ name: 'signupDate', type: 'date' })
await brew.fields.create({ name: 'lifetimeValue', type: 'number' })
```

POST requests get an auto-generated `Idempotency-Key`, so retrying a
transient failure is safe — the API will reject a duplicate create with
a `field_already_exists` error rather than creating the field twice.

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
