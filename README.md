# @brew/api

Official TypeScript SDK for the Brew public API.

- Ergonomic, resource-oriented surface. `brew.contacts.upsert(...)` instead
  of raw HTTP plumbing.
- Typed responses, one typed error class (`BrewApiError`) for every
  non-2xx path.
- Safe retries with exponential backoff + jitter. Auto-generated
  `Idempotency-Key` on POST so retries never double-write.
- `Retry-After` honored on 429.
- Node 20+, server-first. API keys are secrets — do not use this SDK
  directly in a browser.

## Install

```bash
bun add @brew/api
# or
npm install @brew/api
```

## Quick start

```ts
import { createBrewClient } from '@brew/api'

const brew = createBrewClient({
  apiKey: process.env.BREW_API_KEY!,
})

// Create or update a contact by email.
const contact = await brew.contacts.upsert({
  email: 'jane@example.com',
  firstName: 'Jane',
  customFields: {
    plan: 'enterprise',
  },
})

// Look one up.
const found = await brew.contacts.getByEmail({
  email: 'jane@example.com',
})

// Paginated list with filters.
const { contacts, nextCursor } = await brew.contacts.list({
  limit: 100,
  filters: [
    { field: 'customFields.plan', operator: 'eq', value: 'enterprise' },
  ],
})

// Count matching contacts.
const count = await brew.contacts.count({
  filters: [
    { field: 'customFields.plan', operator: 'eq', value: 'enterprise' },
  ],
})
```

## Configuration

```ts
const brew = createBrewClient({
  apiKey: process.env.BREW_API_KEY!,

  // optional — defaults shown
  baseUrl: 'https://brew.new/api',
  timeoutMs: 30_000,
  maxRetries: 2,
  userAgent: 'brew-typescript-sdk/0.1.0-alpha.0',
  fetch: globalThis.fetch, // inject a custom fetch if you need one
})
```

## Resources

### Contacts

```ts
await brew.contacts.list({ limit, cursor, filters })
await brew.contacts.count({ filters })
await brew.contacts.getByEmail({ email })
await brew.contacts.upsert({ email, firstName, lastName, customFields })
await brew.contacts.upsertMany({ contacts: [...] })
await brew.contacts.patch({ email, updates: { ... } })
await brew.contacts.delete({ email })
await brew.contacts.deleteMany({ emails: [...] })
```

### Fields

```ts
await brew.fields.list()
await brew.fields.create({ name: 'plan', type: 'string' })
await brew.fields.delete({ fieldName: 'plan' })
```

## Error handling

Every non-2xx response (and every network-level failure after retries
are exhausted) throws a `BrewApiError`:

```ts
import { BrewApiError } from '@brew/api'

try {
  await brew.contacts.getByEmail({ email: 'missing@example.com' })
} catch (error) {
  if (error instanceof BrewApiError) {
    console.log(error.status) // 404
    console.log(error.code) // 'contact_not_found'
    console.log(error.type) // 'not_found'
    console.log(error.requestId) // server-assigned request id (from x-request-id header)
    console.log(error.retryAfter) // delta-seconds from Retry-After, when present
  }
  throw error
}
```

Never catch and swallow. If a `BrewApiError` lands in your code path, it
is because every retry the SDK was allowed to make has failed — the
server (or the network) is genuinely unhappy.

## Retries + idempotency

The SDK retries transient failures by default:

- `408`, `429`, `500`, `502`, `503`, `504`, and network errors.
- `GET`, `PUT`, `DELETE` retry by default (safe per HTTP semantics).
- `POST` retries ONLY when an `Idempotency-Key` is attached. The SDK
  auto-generates one (RFC 4122 v4 UUID) on every POST unless you pass
  your own:
  ```ts
  await brew.contacts.upsert(
    { email: 'jane@example.com' },
    { idempotencyKey: 'idem_from_your_queue_123' }
  )
  ```
- `PATCH` is never retried — PATCH is a partial-update primitive and
  the server's view of "current state" may have shifted between
  attempts.

Backoff is exponential with full jitter, capped at 10 seconds. If the
server sends a `Retry-After` header on a 429, the SDK uses that value
verbatim — the server is authoritative.

## Raw response access (`options.raw: true`)

> Not yet implemented on the resource wrappers. The transport returns
> `{ data, status, headers, requestId }` internally, and a `raw: true`
> option will surface that shape to callers in a future release. Follow
> the work in `src/core/http.ts`.

## Development

```bash
bun install
bun tsc         # typecheck
bun lint        # eslint
bun run format  # prettier
bun run test    # vitest — NOT `bun test`, that hits Bun's built-in runner and bypasses MSW setup
bun run build   # tsup: dist/ with esm + cjs + .d.ts
```

Full contribution + testing conventions live in `AGENTS.md`. The big
one: every change is driven red → green via vitest + MSW, no exceptions
for "trivial" pure functions.

## OpenAPI

See `docs/openapi.md` for how this SDK intends to keep its types in
sync with the Brew public API contract.

## License

MIT
