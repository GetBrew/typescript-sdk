# `brew.contacts`

Methods for reading and managing contacts. `list` is the simple read,
`get` fetches one by email, and `search` is the structured one — typed
`filters` combined by `logic`, free-text search, sort, and an optional
audience scope.

| Method                      | HTTP                             |
| --------------------------- | -------------------------------- |
| [`list`](#list)             | `GET /v1/contacts`               |
| [`get`](#get)               | `GET /v1/contacts/{email}`       |
| [`search`](#search)         | `POST /v1/contacts/search`       |
| [`searchAll`](#searchall)   | `POST /v1/contacts/search`       |
| [`count`](#count)           | `POST /v1/contacts/search`       |
| [`upsert`](#upsert)         | `POST /v1/contacts`              |
| [`upsertMany`](#upsertmany) | `POST /v1/contacts`              |
| [`patch`](#patch)           | `PATCH /v1/contacts/{email}`     |
| [`delete`](#delete)         | `DELETE /v1/contacts/{email}`    |
| [`deleteMany`](#deletemany) | `POST /v1/contacts/batch-delete` |

> **New in 10.0.0.** `list(query)` and `get(email)` are real routes.
> Looking a contact up by email no longer means an `equals` filter and a
> `data[0]` that might be `undefined`.

---

## `list`

The brand's contacts, newest first, under `{ data, pagination }`.

```ts
type ListContactsInput = {
  readonly search?: string // case-insensitive across email/first/last
  readonly audienceId?: string // scope to a saved audience
  readonly sort?: string
  readonly order?: 'asc' | 'desc'
  readonly limit?: number
  readonly cursor?: string
}

const { data, pagination } = await brew.contacts.list({ limit: 50 })
```

Reach for [`search`](#search) when you need typed `filters` combined by
`logic`.

---

## `get`

One contact, as the bare row. An address with no contact is
`404 CONTACT_NOT_FOUND`. The address is URL-encoded for you, so
`a+b@example.com` works as written.

```ts
const contact = await brew.contacts.get('jane@example.com')
console.log(contact.subscribed, contact.customFields)
```

## Shared types

```ts
type Contact = {
  readonly email: string
  readonly firstName?: string
  readonly lastName?: string
  readonly subscribed: boolean // default true
  readonly validationStatus?: 'valid' | 'risky' | 'invalid'
  readonly validationDetails?: {
    readonly provider: 'brew'
    readonly reason?: string
    readonly didYouMean?: string
    readonly risk?: string
    readonly isDisposable?: boolean
    readonly isRole?: boolean
  }
  readonly lastValidatedAt?: string // ISO-8601 date-time (last provider check)
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

`search`, `searchAll`, and `count` accept the same filter shape — an
array of clauses combined by the top-level `logic`:

```ts
type ContactsFilterClause = {
  readonly field: string // e.g. 'email' or 'customFields.plan'
  readonly operator: string
  readonly value?: string | number | boolean | ReadonlyArray<unknown>
}
```

Use dotted notation for custom fields (e.g. `'customFields.plan'`).
The `operator` is one of the operator names the Brew API recognizes:

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
// Single clause
;[{ field: 'subscribed', operator: 'equals', value: true }]

// Explicit operator on a custom field
;[{ field: 'customFields.plan', operator: 'equals', value: 'enterprise' }]

// Multi-clause, combined by the top-level `logic`
{
  logic: 'and',
  filters: [
    { field: 'subscribed', operator: 'equals', value: true },
    { field: 'customFields.plan', operator: 'equals', value: 'enterprise' },
  ],
}
```

The filter array travels in the POST body — there is no query-string
serialization to think about. Pass the clauses, the SDK sends them as-is.

> The SDK does not type-check the operator name (the underlying
> OpenAPI type leaves `operator` as a `string`), so a typo like `eq`
> instead of `equals` will compile fine but the server will return a 400. The list above is the source of truth.

---

## `search`

The single, canonical contacts read. One paginated page of contacts
matching an optional set of filters, free-text search, sort, and audience
scope. Pass an empty `{}` (or no argument) to read every contact,
newest-first.

```ts
type SearchContactsInput = Readonly<{
  audienceId?: string // scope to a saved audience's members
  search?: string // case-insensitive search across email/first/last
  filters?: ReadonlyArray<ContactsFilterClause>
  logic?: 'and' | 'or' // default 'and'
  sort?: string // default 'createdAt'
  order?: 'asc' | 'desc' // default 'desc'
  limit?: number // 1–100, default 50
  cursor?: string // opaque, from previous response
}>

type SearchContactsResponse = {
  readonly data: ReadonlyArray<Contact>
  readonly pagination: {
    readonly limit: number
    readonly cursor: string | null
    readonly hasMore: boolean
  }
}

search(input?: SearchContactsInput): Promise<SearchContactsResponse>
```

```ts
const { data, pagination } = await brew.contacts.search({
  limit: 100,
  logic: 'and',
  filters: [
    { field: 'subscribed', operator: 'equals', value: true },
    { field: 'customFields.plan', operator: 'equals', value: 'enterprise' },
  ],
})

if (pagination.hasMore && pagination.cursor) {
  const next = await brew.contacts.search({
    limit: 100,
    cursor: pagination.cursor,
  })
}
```

### Look up a single contact by email

Use [`get`](#get) — `brew.contacts.get('jane@example.com')` returns the
bare row and `404`s when there is none. The old `equals`-filter-and-read-
`data[0]` idiom is no longer necessary.

### Scope to a saved audience

Pass `audienceId` to read only the members of a saved audience (combinable
with `filters` / `search`):

```ts
const { data } = await brew.contacts.search({ audienceId: 'aud_123' })
```

---

## `searchAll`

Async-iterate every contact matching the same input — `searchAll`
transparently follows the cursor so you never page by hand. Same input
shape as [`search`](#search) (minus `cursor`, which it manages).

```ts
searchAll(
  input?: Omit<SearchContactsInput, 'cursor'>
): AsyncIterable<Contact>
```

```ts
for await (const contact of brew.contacts.searchAll({
  filters: [{ field: 'subscribed', operator: 'equals', value: true }],
})) {
  console.log(contact.email)
}
```

---

## `count`

Count contacts matching an optional set of filters (the `count: true`
mode of the search read). Returns the count as a bare `number` (the
`{ count }` envelope is unwrapped for DX).

```ts
type CountContactsInput = {
  readonly audienceId?: string
  readonly search?: string
  readonly filters?: ReadonlyArray<ContactsFilterClause>
  readonly logic?: 'and' | 'or'
}

count(input?: CountContactsInput): Promise<number>
```

```ts
const enterpriseCount = await brew.contacts.count({
  filters: [
    { field: 'customFields.plan', operator: 'equals', value: 'enterprise' },
  ],
})
```

---

## `countBy`

Exact counts per field value, per email domain, or per period, largest
group first. Takes the `count` knobs plus at least one of `groupBy` (up to
two fields: a contact field, a custom field, or `emailDomain`) and
`bucket` (`day` | `week` | `month`, over `createdAt`). Returns the whole
envelope: the total `count`, the largest 200 `groups` (`key` maps each
grouped field to its value, `bucket` is the ISO period start), and
`otherCount` for the contacts in the groups past the first 200.

```ts
countBy(input: CountContactsByInput): Promise<CountContactsByResponse>
```

```ts
const { count, groups } = await brew.contacts.countBy({
  groupBy: ['emailDomain'],
})
for (const group of groups ?? []) {
  console.log(group.key.emailDomain, group.count)
}

// Signups per month in a saved audience:
const perMonth = await brew.contacts.countBy({ audienceId, bucket: 'month' })
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

Delete a single contact by email. Idempotent: an unknown email resolves
`200` with `{ deleted: false }` rather than throwing.

```ts
type DeleteContactInput = { readonly email: string }
type DeleteContactResponse = {
  readonly email: string
  readonly deleted: boolean
}

delete(
  input: DeleteContactInput,
  options?: RequestOptions
): Promise<DeleteContactResponse>
```

```ts
const { deleted } = await brew.contacts.delete({
  email: 'jane@example.com',
})
// deleted === false when the email had no contact
```

---

## `deleteMany`

Batch delete by email list (up to 1000). Always responds `200`. The
response is `{ deletedCount, notFound }` — the count was `deleted`
before 10.0.0, and `notFound` is always present (empty when every email
matched). Cross-check `notFound` to detect typos or already-deleted
records.

```ts
type DeleteManyContactsInput = {
  readonly emails: ReadonlyArray<string>
}

type DeleteManyContactsResponse = {
  readonly deletedCount: number
  readonly notFound: ReadonlyArray<string>
}

deleteMany(
  input: DeleteManyContactsInput,
  options?: RequestOptions
): Promise<DeleteManyContactsResponse>
```

```ts
const result = await brew.contacts.deleteMany({
  emails: ['a@example.com', 'b@example.com', 'c@example.com'],
})

console.log(result.deletedCount) // e.g. 2
if (result.notFound.length > 0) {
  console.warn('No contact found for:', result.notFound)
}
```
