# `brew.contacts`

Eight methods for managing contacts.

| Method                      | HTTP                            |
| --------------------------- | ------------------------------- |
| [`list`](#list)             | `GET /v1/contacts`              |
| [`count`](#count)           | `GET /v1/contacts?action=count` |
| [`getByEmail`](#getbyemail) | `GET /v1/contacts?email=...`    |
| [`upsert`](#upsert)         | `POST /v1/contacts`             |
| [`upsertMany`](#upsertmany) | `POST /v1/contacts`             |
| [`patch`](#patch)           | `PATCH /v1/contacts`            |
| [`delete`](#delete)         | `DELETE /v1/contacts`           |
| [`deleteMany`](#deletemany) | `DELETE /v1/contacts`           |

## Shared types

```ts
type Contact = {
  readonly email: string
  readonly firstName?: string
  readonly lastName?: string
  readonly customFields?: Readonly<Record<string, unknown>>
  readonly createdAt?: string
  readonly updatedAt?: string
}

type ContactFilter = {
  readonly field: string
  readonly operator:
    | 'eq'
    | 'neq'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'nin'
    | 'contains'
    | 'exists'
  readonly value: unknown
}
```

`field` uses dotted notation for custom fields — e.g.
`'customFields.plan'`.

---

## `list`

Paginated list of contacts with optional filters.

```ts
type ListContactsInput = {
  readonly limit?: number
  readonly cursor?: string
  readonly filters?: ReadonlyArray<ContactFilter>
}

type ListContactsResponse = {
  readonly contacts: ReadonlyArray<Contact>
  readonly nextCursor?: string
}

list(input?: ListContactsInput): Promise<ListContactsResponse>
```

```ts
const { contacts, nextCursor } = await brew.contacts.list({
  limit: 100,
  filters: [
    { field: 'customFields.plan', operator: 'eq', value: 'enterprise' },
  ],
})

if (nextCursor) {
  const next = await brew.contacts.list({ limit: 100, cursor: nextCursor })
}
```

Filters are JSON-encoded into a single `filters` query parameter so the
wire format stays a plain GET (no body, caching proxies happy).

---

## `count`

Count contacts matching an optional set of filters. Returns the count
as a bare `number` (the `{ count }` envelope is unwrapped for DX).

```ts
type CountContactsInput = {
  readonly filters?: ReadonlyArray<ContactFilter>
}

count(input?: CountContactsInput): Promise<number>
```

```ts
const enterpriseCount = await brew.contacts.count({
  filters: [
    { field: 'customFields.plan', operator: 'eq', value: 'enterprise' },
  ],
})
```

---

## `getByEmail`

Look up a single contact by email. Returns a bare `Contact` (the
`{ contact }` envelope is unwrapped). Throws `BrewApiError` with code
`contact_not_found` if the contact does not exist.

```ts
type GetContactByEmailInput = { readonly email: string }

getByEmail(input: GetContactByEmailInput): Promise<Contact>
```

```ts
const contact = await brew.contacts.getByEmail({ email: 'jane@example.com' })
```

---

## `upsert`

Create or update a single contact by email. Email is the identity;
absent fields are treated as "leave unchanged" on update, not as
"clear".

```ts
type UpsertContactInput = {
  readonly email: string
  readonly firstName?: string
  readonly lastName?: string
  readonly customFields?: Readonly<Record<string, unknown>>
}

upsert(input: UpsertContactInput, options?: RequestOptions): Promise<Contact>
```

```ts
const contact = await brew.contacts.upsert({
  email: 'jane@example.com',
  firstName: 'Jane',
  customFields: { plan: 'enterprise' },
})
```

POST requests get an auto-generated `Idempotency-Key` so retries are
safe by default. See
[retries-and-idempotency](./retries-and-idempotency.md).

---

## `upsertMany`

Batch upsert. The wire format is `{ contacts: [...] }`; the SDK keeps
single vs. batch as two explicit methods rather than overloading.

```ts
type UpsertManyContactsInput = {
  readonly contacts: ReadonlyArray<UpsertContactInput>
}

type UpsertManyContactsResponse = {
  readonly contacts: ReadonlyArray<Contact>
}

upsertMany(
  input: UpsertManyContactsInput,
  options?: RequestOptions
): Promise<UpsertManyContactsResponse>
```

```ts
const result = await brew.contacts.upsertMany({
  contacts: [
    { email: 'a@example.com', firstName: 'A' },
    { email: 'b@example.com', firstName: 'B' },
  ],
})
```

---

## `patch`

Partial update by email. The SDK flattens
`{ email, updates: { ... } }` into the wire shape `{ email, ... }` so
the caller's "identity + changes" mental model stays clean.

```ts
type PatchContactUpdates = {
  readonly firstName?: string
  readonly lastName?: string
  readonly customFields?: Readonly<Record<string, unknown>>
}

type PatchContactInput = {
  readonly email: string
  readonly updates: PatchContactUpdates
}

patch(input: PatchContactInput, options?: RequestOptions): Promise<Contact>
```

```ts
const contact = await brew.contacts.patch({
  email: 'jane@example.com',
  updates: { customFields: { plan: 'pro' } },
})
```

**PATCH is never retried**, even with an idempotency key — the server's
view of "current state" may have shifted between attempts. See
[retries-and-idempotency](./retries-and-idempotency.md) for the
rationale.

---

## `delete`

Delete a single contact by email.

```ts
type DeleteContactInput = { readonly email: string }
type DeleteContactsResponse = { readonly deleted: number }

delete(
  input: DeleteContactInput,
  options?: RequestOptions
): Promise<DeleteContactsResponse>
```

```ts
const { deleted } = await brew.contacts.delete({ email: 'jane@example.com' })
// deleted === 1 if the contact existed, 0 otherwise
```

---

## `deleteMany`

Batch delete by email list. Reuses `DeleteContactsResponse` from the
single-delete method, so any change to the deletion response shape
ripples through both sites automatically.

```ts
type DeleteManyContactsInput = {
  readonly emails: ReadonlyArray<string>
}

deleteMany(
  input: DeleteManyContactsInput,
  options?: RequestOptions
): Promise<DeleteContactsResponse>
```

```ts
const { deleted } = await brew.contacts.deleteMany({
  emails: ['a@example.com', 'b@example.com', 'c@example.com'],
})
```
