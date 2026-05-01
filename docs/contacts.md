# `brew.contacts`

Eight methods for managing contacts.

| Method                      | HTTP                          |
| --------------------------- | ----------------------------- |
| [`list`](#list)             | `GET /v1/contacts`            |
| [`count`](#count)           | `GET /v1/contacts?count=true` |
| [`getByEmail`](#getbyemail) | `GET /v1/contacts?email=...`  |
| [`upsert`](#upsert)         | `POST /v1/contacts`           |
| [`upsertMany`](#upsertmany) | `POST /v1/contacts`           |
| [`patch`](#patch)           | `PATCH /v1/contacts`          |
| [`delete`](#delete)         | `DELETE /v1/contacts`         |
| [`deleteMany`](#deletemany) | `DELETE /v1/contacts`         |

## Shared types

```ts
type Contact = {
  readonly email: string
  readonly firstName?: string
  readonly lastName?: string
  readonly subscribed: boolean // default true
  readonly verificationStatus?: 'valid' | 'risky' | 'invalid'
  readonly suppressed: boolean // default false
  readonly suppressedReason?: string | null
  readonly createdAt: number // UNIX millis, NOT a string
  readonly updatedAt: number // UNIX millis, NOT a string
  readonly importId?: string | null
  readonly customFields: Readonly<Record<string, unknown>>
}
```

> **Heads up on timestamps**: `createdAt` and `updatedAt` are UNIX
> millisecond integers, not ISO strings. Convert with
> `new Date(contact.createdAt)` if you need a Date object.

### Filters

`list` and `count` accept the same filter shape:

```ts
type ContactsFilter = {
  readonly _logic?: 'and' | 'or' | 'none' // default 'and'
} & {
  readonly [field: string]:
    | string // shorthand equality
    | { readonly [operator: string]: string | number | boolean }
}
```

Use dotted notation for custom fields (e.g. `'customFields.plan'`).
The shorthand form is equality; the operator form uses one of the
operator names the Brew API recognizes:

| Operator           | Meaning                             |
| ------------------ | ----------------------------------- |
| `equals`           | Exact match                         |
| `not_equals`       | Not an exact match                  |
| `contains`         | Substring (string fields)           |
| `not_contains`     | Negated substring                   |
| `contains_any`     | Contains any of the listed values   |
| `not_contains_any` | Contains none of the listed values  |
| `starts_with`      | String starts with value            |
| `ends_with`        | String ends with value              |
| `is_empty`         | Field is empty / unset              |
| `is_not_empty`     | Field has any value                 |
| `in`               | Value is in the listed set          |
| `not_in`           | Value is not in the listed set      |
| `exists`           | Field exists on the contact         |
| `not_exists`       | Field does not exist on the contact |

```ts
// Shorthand equality
{ subscribed: 'true' }

// Explicit operator
{ 'customFields.plan': { equals: 'enterprise' } }

// Multi-clause with logic
{
  _logic: 'and',
  subscribed: 'true',
  'customFields.plan': { equals: 'enterprise' },
}
```

The SDK serializes the filter as `deepObject` style query params on
the wire (`filter[subscribed]=true`,
`filter[customFields.plan][equals]=enterprise`). Callers never see
the bracket notation directly — pass the object, the SDK does the
rest.

> The SDK does not type-check the operator name (the underlying
> OpenAPI type is `[key: string]: string | { ... }`), so a typo
> like `eq` instead of `equals` will compile fine but the server
> will return a 400. The list above is the source of truth.

---

## `list`

Paginated list of contacts with optional filters, search, and sort.

```ts
type ListContactsInput = Readonly<{
  limit?: number          // 1–100, default 50
  cursor?: string         // opaque, from previous response
  search?: string         // case-insensitive search across email/first/last
  sort?: string           // default 'createdAt'
  order?: 'asc' | 'desc'  // default 'desc'
  filter?: ContactsFilter
}>

type ListContactsResponse = {
  readonly contacts: ReadonlyArray<Contact>
  readonly pagination: {
    readonly limit: number
    readonly cursor: string | null
    readonly hasMore: boolean
  }
}

list(input?: ListContactsInput): Promise<ListContactsResponse>
```

```ts
const { contacts, pagination } = await brew.contacts.list({
  limit: 100,
  filter: {
    _logic: 'and',
    subscribed: 'true',
    'customFields.plan': { equals: 'enterprise' },
  },
})

if (pagination.hasMore && pagination.cursor) {
  const next = await brew.contacts.list({
    limit: 100,
    cursor: pagination.cursor,
  })
}
```

---

## `count`

Count contacts matching an optional set of filters. Returns the count
as a bare `number` (the `{ count }` envelope is unwrapped for DX).

```ts
type CountContactsInput = {
  readonly filter?: ContactsFilter
}

count(input?: CountContactsInput): Promise<number>
```

```ts
const enterpriseCount = await brew.contacts.count({
  filter: {
    'customFields.plan': { equals: 'enterprise' },
  },
})
```

---

## `getByEmail`

Look up a single contact by email. Returns a bare `Contact` (the
`{ contact }` envelope is unwrapped). Throws `BrewApiError` with code
`CONTACT_NOT_FOUND` if the contact does not exist.

```ts
type GetContactByEmailInput = { readonly email: string }

getByEmail(input: GetContactByEmailInput): Promise<Contact>
```

```ts
const contact = await brew.contacts.getByEmail({ email: 'jane@example.com' })
console.log(new Date(contact.createdAt)) // remember: createdAt is a number
```

---

## `upsert`

Create or update a single contact by email. Email is the identity;
absent fields are treated as "leave unchanged" on update.

```ts
type UpsertContactInput = {
  readonly email: string
  readonly firstName?: string
  readonly lastName?: string
  readonly subscribed?: boolean
  readonly customFields?: { readonly [key: string]: unknown }
}

type UpsertContactResponse = {
  readonly contact: Contact
  readonly created: boolean        // true if newly inserted, false if updated
  readonly fieldsCreated: string[] // any custom fields auto-defined
  readonly warnings: ReadonlyArray<UpsertWarning>
}

upsert(
  input: UpsertContactInput,
  options?: RequestOptions
): Promise<UpsertContactResponse>
```

```ts
const result = await brew.contacts.upsert({
  email: 'jane@example.com',
  firstName: 'Jane',
  customFields: { plan: 'enterprise' },
})

console.log(result.contact.email)
console.log(result.created) // true if this was an insert
console.log(result.fieldsCreated) // ['plan'] if 'plan' was a new custom field
```

POST requests get an auto-generated `Idempotency-Key` so retries are
safe by default. See
[retries-and-idempotency](./retries-and-idempotency.md).

---

## `upsertMany`

Batch upsert. The wire format is `{ contacts: [...] }`; the SDK keeps
single vs. batch as two explicit methods.

```ts
type UpsertManyContactsInput = {
  readonly contacts: ReadonlyArray<UpsertContactInput>
}

type UpsertManyContactsResponse = {
  readonly summary: {
    readonly inserted: number
    readonly updated: number
    readonly failed: number
  }
  readonly fieldsCreated: ReadonlyArray<string>
  readonly errors: ReadonlyArray<{
    readonly email: string
    readonly code: string
    readonly message: string
  }>
  readonly warnings: ReadonlyArray<UpsertWarning>
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

console.log(result.summary) // { inserted: 1, updated: 1, failed: 0 }

if (result.errors.length > 0) {
  for (const err of result.errors) {
    console.error(`${err.email}: ${err.code} — ${err.message}`)
  }
}
```

> **Partial failures are not exceptions.** The API returns `200` on
> full success and `207 Multi-Status` on partial failure. Both come
> back as the same envelope shape and the SDK **does not throw** on
> `207` — `await brew.contacts.upsertMany(...)` resolves with the
> body in either case. You **must** inspect `result.summary.failed`
> and `result.errors[]` after every call to detect rows that the
> server rejected. If you `try / catch` only, you will silently lose
> per-row failures.

---

## `patch`

Partial update by email. The wire format is `{ email, fields: {...} }`.

```ts
type PatchContactInput = {
  readonly email: string
  readonly fields: { readonly [key: string]: unknown }
}

type PatchContactResponse = {
  readonly contact: Contact
  readonly updated: ReadonlyArray<string>  // field names that actually changed
}

patch(
  input: PatchContactInput,
  options?: RequestOptions
): Promise<PatchContactResponse>
```

```ts
const result = await brew.contacts.patch({
  email: 'jane@example.com',
  fields: {
    firstName: 'Janet',
    'customFields.plan': 'pro',
  },
})

console.log(result.updated) // ['firstName', 'customFields.plan']
```

`fields` is an open object: include any combination of writable core
fields (`firstName`, `lastName`, `subscribed`) and custom fields
(keys like `'customFields.plan'`).

**PATCH is never retried**, even with an idempotency key — the
server's view of "current state" may have shifted between attempts.
See [retries-and-idempotency](./retries-and-idempotency.md) for the
rationale.

---

## `delete`

Delete a single contact by email. Returns `404 CONTACT_NOT_FOUND` (a
thrown `BrewApiError`) when the contact does not exist — unlike
[`deleteMany`](#deletemany), single-delete will never resolve with
`deleted: 0`.

```ts
type DeleteContactInput = { readonly email: string }
type DeleteContactsResponse = {
  readonly deleted: number
  readonly notFound?: ReadonlyArray<string>
}

delete(
  input: DeleteContactInput,
  options?: RequestOptions
): Promise<DeleteContactsResponse>
```

```ts
const { deleted } = await brew.contacts.delete({
  email: 'jane@example.com',
})
// deleted === 1 on success; throws BrewApiError(CONTACT_NOT_FOUND) otherwise
```

---

## `deleteMany`

Batch delete by email list. Always responds `200`. The response
includes `deleted` (the number of contacts removed) plus an optional
`notFound` array listing any submitted emails that did not match an
existing contact (omitted when every email matched). Cross-check
`notFound` to detect typos or already-deleted records.

```ts
type DeleteManyContactsInput = {
  readonly emails: ReadonlyArray<string>
}

type DeleteContactsResponse = {
  readonly deleted: number
  readonly notFound?: ReadonlyArray<string>
}

deleteMany(
  input: DeleteManyContactsInput,
  options?: RequestOptions
): Promise<DeleteContactsResponse>
```

```ts
const result = await brew.contacts.deleteMany({
  emails: ['a@example.com', 'b@example.com', 'c@example.com'],
})

console.log(result.deleted) // e.g. 2
if (result.notFound?.length) {
  console.warn('No contact found for:', result.notFound)
}
```
