# Public API SDK OSS Plan

> **Implementation status (2026-05-01).** The originally-deferred items
> from the bottom of this plan are now shipped:
>
> - `RequestOptions.raw` is wired end-to-end. Every resource method
>   takes an optional `RequestOptions` argument and returns
>   `BrewRawResponse<T>` instead of the unwrapped payload when called
>   with `{ raw: true }`.
> - `brew.contacts.listAll(...)` async iterator pages over every
>   matching contact, honors `AbortSignal` between pages, and is
>   covered by MSW tests in `tests/resources/contacts/list-all.test.ts`.
> - `SDK_VERSION` is derived from `package.json` at build time via a
>   tsup `define` substitution. Releasing now only requires bumping
>   `package.json#version`.
> - The OpenAPI YAML is mirrored into all three consumer locations
>   (`sub-agent-orchestrator/openapi/public-api-v1.yaml`,
>   `docs/api-reference/openapi-public-v1.yaml`,
>   `typescript-sdk/openapi/public-api-v1.yaml`) by a single
>   `pnpm openapi:generate` command in the app package, with a
>   `pnpm openapi:check` CI guard. SDK type regeneration is one
>   command (`pnpm openapi:sync:sdk-types`).
>
> The legacy section headings below describe the original DX goals.
> Keep the bar; the implementation now meets it.

## Goal

Build a standalone open source TypeScript SDK on top of the public Brew API.

It should have excellent DX.
It should feel easier than raw HTTP.
It should still stay honest to the real API contract.

This SDK is a consumer of the API.
It does not define the API.
The API stays the foundation.

## Core Principles

1. API first.
   The public API contract is the source of truth.

2. SDK second.
   The SDK is a thin ergonomic layer on top of the API.

3. OpenAPI boundary.
   The SDK should consume generated OpenAPI types.
   It should not import app repo internals at runtime.

4. Great defaults.
   Good retries.
   Good errors.
   Good naming.
   Good typing.

5. Easy escape hatches.
   Custom `fetch`.
   Custom base URL.
   Abort signals.
   Raw response access when needed.

6. Server first.
   API keys are server side secrets.
   Do not optimize this SDK for browser public use.

## DX Bar

The SDK should feel so good that most users barely need the API docs for normal work.

That means.

- clear resource names
- clear method names
- object params only
- good defaults
- strong editor autocomplete
- typed success responses
- typed error handling
- safe retries
- no weird transport details leaking into normal usage

Good.

```ts
const contact = await brew.contacts.getByEmail({
  email: 'jane@example.com',
})
```

Bad.

```ts
const contact = await brew.request('GET', '/v1/contacts', {
  email: 'jane@example.com',
})
```

The raw API is still important.
But the SDK should feel like a product.

## Zero Context Notes About The Brew App API

If another agent starts with zero context, these are the important facts.

### What the current public API is

The live public API in the app repo currently covers.

- contacts
- contact fields

Endpoints live under.

- `app/api/v1/contacts/route.ts`
- `app/api/v1/fields/route.ts`

The public contract source of truth lives in.

- `lib/contacts/contracts.ts`

The generated OpenAPI source lives in.

- `openapi/public-api-v1.ts`
- `openapi/public-api-v1-contacts.ts`
- `openapi/public-api-v1-fields.ts`

The generated YAML artifact lives in.

- `openapi/public-api-v1.yaml`

### How the current app API is structured

The app uses a clean layering model.

1. Thin route entrypoints in `app/api/v1/*`
2. Shared public API transport and cross cutting logic in `lib/api/*`
3. Domain endpoint logic in `lib/contacts/endpoints/*`
4. Shared domain service logic in `lib/contacts/service.ts`
5. Mongo and Convex access behind domain and data modules

This is important.
The SDK should not copy app internals.
It should only consume the public contract.

### How auth works today

Shared auth lives in.

- `lib/api/auth/index.ts`

Rules.

- API key auth is preferred when an API key header is present
- `Authorization: Bearer brew_xxx` works
- `X-API-Key: brew_xxx` works
- if no API key header exists, the app can fall back to Clerk session auth
- public permissions like `contacts` are enforced by the shared auth layer

The SDK should only care about API key auth.
Session fallback is an app concern, not an SDK concern.

### How rate limiting works today

Shared rate limiting lives in.

- `lib/api/rate_limit/policy.ts`
- `lib/api/rate_limit/store.ts`

Important behavior.

- rolling 60 second windows
- Upstash Redis backed
- API key single write class is `100 req/min`
- batch POST class is `10 req/min`
- session traffic has its own higher class
- standard rate limit headers are returned
- Redis failures fail open and get logged

The SDK should respect `429` and `Retry-After`.

### How idempotency works today

Shared idempotency lives in.

- `lib/api/idempotency/store.ts`

Important behavior.

- POST only
- uses `Idempotency-Key`
- same key plus same payload replays original response
- same key plus different payload returns conflict

The SDK should make this easy by default for POST methods.

### How ops and observability work today

Generic server observability lives in.

- `lib/server/observability/*`

API specific logging lives in.

- `lib/api/observability/index.ts`

Important behavior.

- structured JSON logs
- request ids on every response
- event names like `api.request.completed`
- rate limit and idempotency events are logged too
- Datadog is logs first for now, not full tracing

The SDK does not need Datadog logic.
But the SDK should preserve useful metadata like `requestId` in errors and raw responses.

### How tests are split today

App repo tests are split on purpose.

- `bun run test:unit` for normal repo tests
- `bun run test:api` for real public API integration tests

The SDK repo should not recreate those real API tests.
It should use MSW and focus on client behavior.

### Read these first in the app repo

For another agent starting from zero, read these files first.

- `openapi/README.md`
- `lib/api/README.md`
- `app/api/v1/README.md`
- `tests/api/README.md`
- `docs/api-design-contacts.md`
- `docs/api-implementation-guardrails.md`

## Non Goals

- Do not mirror every raw HTTP shape directly if that hurts DX.
- Do not depend on live Brew API for the SDK test suite.
- Do not couple the SDK to Mongo or Convex internals.
- Do not make the SDK the source of truth for contracts.

## Recommended Package Setup

Use its own repo or package.

Example package name.

- `@brew.new/sdk`

Use Bun and TypeScript.

Suggested layout.

```txt
packages/brew-api-sdk/
  package.json
  tsconfig.json
  README.md
  src/
    index.ts
    client.ts
    types.ts
    generated/
      openapi-types.ts
    core/
      auth.ts
      config.ts
      errors.ts
      headers.ts
      http.ts
      idempotency.ts
      retry.ts
      response.ts
      url.ts
    resources/
      contacts.ts
      fields.ts
  tests/
    msw/
      server.ts
      handlers.ts
    client.test.ts
    contacts.test.ts
    fields.test.ts
    retries.test.ts
    errors.test.ts
```

## Public Client Shape

Top level client.

```ts
const brew = createBrewClient({
  apiKey: process.env.BREW_API_KEY!,
})
```

Recommended config shape.

```ts
type BrewClientConfig = {
  apiKey: string
  baseUrl?: string
  fetch?: typeof globalThis.fetch
  timeoutMs?: number
  maxRetries?: number
  userAgent?: string
}
```

Recommended defaults.

- `baseUrl` defaults to `https://brew.new/api`
- `timeoutMs` defaults to something reasonable like `30_000`
- `maxRetries` defaults to `2`
- internal `fetch` defaults to global `fetch`

## Resource Design

Do not expose awkward multiplexed API shapes directly.

The raw API is flexible.
The SDK should be clearer.

Example.

Raw API.

- `GET /v1/contacts` can mean lookup or count or list
- `POST /v1/contacts` can mean single or batch
- `DELETE /v1/contacts` can mean single or batch

SDK shape.

```ts
brew.contacts.list(...)
brew.contacts.count(...)
brew.contacts.getByEmail(...)
brew.contacts.upsert(...)
brew.contacts.upsertMany(...)
brew.contacts.patch(...)
brew.contacts.delete(...)
brew.contacts.deleteMany(...)

brew.fields.list(...)
brew.fields.create(...)
brew.fields.delete(...)
```

This is better DX.
It is still powered by the same API underneath.

## Current Resource Surface

### Contacts

```ts
type ContactsClient = {
  list(input?: ListContactsInput): Promise<ListContactsResponse>
  count(input?: CountContactsInput): Promise<CountContactsResponse>
  getByEmail(input: { email: string }): Promise<GetContactResponse>
  upsert(
    input: UpsertContactInput,
    options?: RequestOptions
  ): Promise<UpsertContactResponse>
  upsertMany(
    input: { contacts: UpsertContactInput[] },
    options?: RequestOptions
  ): Promise<UpsertContactsBatchResponse>
  patch(
    input: PatchContactInput,
    options?: RequestOptions
  ): Promise<PatchContactResponse>
  delete(
    input: { email: string },
    options?: RequestOptions
  ): Promise<DeleteContactsResponse>
  deleteMany(
    input: { emails: string[] },
    options?: RequestOptions
  ): Promise<DeleteContactsResponse>
}
```

### Fields

```ts
type FieldsClient = {
  list(): Promise<ListFieldsResponse>
  create(
    input: CreateFieldInput,
    options?: RequestOptions
  ): Promise<SuccessResponse>
  delete(
    input: { fieldName: string },
    options?: RequestOptions
  ): Promise<SuccessResponse>
}
```

## Request Options

Per request overrides are useful.

```ts
type RequestOptions = {
  signal?: AbortSignal
  timeoutMs?: number
  maxRetries?: number
  idempotencyKey?: string
  raw?: boolean
}
```

Notes.

- `raw` can return response metadata together with parsed data.
- `idempotencyKey` is mainly for `POST`.

## Error Design

The SDK should throw one typed error class.

Example.

```ts
class BrewApiError extends Error {
  status: number
  code: string
  type: string
  requestId?: string
  suggestion?: string
  docs?: string
  retryAfter?: number
}
```

This should be built from the public API error envelope.

Useful rules.

- Preserve the API `code`
- Preserve the API `type`
- Preserve `requestId` from response headers
- Preserve `retryAfter` if present
- Keep the message readable

Example use.

```ts
try {
  await brew.contacts.getByEmail({
    email: 'missing@example.com',
  })
} catch (error) {
  if (error instanceof BrewApiError && error.code === 'CONTACT_NOT_FOUND') {
    console.log(error.requestId)
  }
}
```

## Retries

Yes.
The SDK should help here.
But retries must stay safe.

### Retry by default for

- network failures
- `408`
- `429`
- `500`
- `502`
- `503`
- `504`

### Do not retry by default for

- `400`
- `401`
- `403`
- `404`
- `409`
- `422`

### Method policy

- `GET` can retry by default
- `DELETE` can retry by default
- `POST` should retry only when idempotent
- `PATCH` should not retry by default

### POST idempotency

The SDK should make this easy.

Recommended behavior.

- If caller provides `idempotencyKey`, use it
- If caller does not provide one, auto generate one for `POST`
- Send it as `Idempotency-Key`

This gives great DX.
Users do not need to think about retry safety every time.

### Retry After

If the API returns `429` with `Retry-After`, obey it.

### Jitter

Use exponential backoff with jitter.
Keep it boring and predictable.

## Typing Strategy

Use generated OpenAPI types for wire level contracts.
Then wrap them with hand written SDK methods.

Best hybrid.

1. App repo Zod contracts.
2. Generated OpenAPI spec.
3. Generated TypeScript types in SDK repo.
4. Hand written resource clients on top.

This gives.

- strong type safety
- no drift
- better method names
- better docs in editor

Do not import app repo Zod files into the SDK package.
The OpenAPI spec is the clean contract boundary.

## Raw Response Access

Most users want parsed data only.
Some users need headers and status.

Support both.

Recommended default.

```ts
const contact = await brew.contacts.getByEmail({ email: 'jane@example.com' })
```

Optional raw mode.

```ts
const result = await brew.contacts.getByEmail(
  { email: 'jane@example.com' },
  { raw: true }
)

result.data
result.status
result.headers
result.requestId
```

This is especially useful for rate limit headers and debugging.

## Pagination DX

Do not stop at just exposing cursor strings.

Good first version.

- `contacts.list({ limit, cursor, ... })`

Good later version.

- async iterator helper

Example later.

```ts
for await (const contact of brew.contacts.listAll({ limit: 100 })) {
  console.log(contact.email)
}
```

Do not build this first.
But design the internal pagination helpers so it can be added cleanly.

## Testing Strategy

The SDK test suite should not depend on the real Brew API.

That is the right place to use mocks.

Use MSW.

### Why MSW is good here

- tests stay fast
- tests stay deterministic
- no staging dependency
- easy to test retries and errors
- easy to test odd headers and partial failures

### What to test with MSW

- auth header injection
- `X-API-Key` support if needed
- base URL config
- request body serialization
- query param serialization
- retries
- `Retry-After` handling
- idempotency key generation
- error mapping into `BrewApiError`
- raw response mode
- timeout behavior

### What not to do in SDK tests

- do not hit the real Brew API
- do not recreate the app repo endpoint integration suite
- do not test Mongo or Convex internals

The app repo already owns real API confidence.
The SDK repo should own client behavior confidence.

## Versioning Strategy

Keep SDK versioning boring.

Recommended model.

- SDK major `1.x` targets public API `v1`
- Breaking SDK DX changes require a major bump
- Breaking API `v2` should map to a new SDK major or a new client namespace

Practical rule.

- API path version and SDK major should align when possible

Examples.

- public API `v1` -> SDK `1.x`
- public API `v2` -> SDK `2.x`

This keeps things understandable.

## Future Expansion Lego Blocks

Design for more resources now.

Likely future resources.

- automations
- transactional email
- audiences
- analytics
- templates

So the SDK core should already support.

- shared auth
- shared error handling
- shared retries
- shared request builder
- shared response parser
- shared raw mode
- shared pagination helpers

Then each new resource only adds resource specific methods.

## Recommended Internal Modules

### `core/http.ts`

Owns request sending.

- build URL
- inject auth
- apply timeout
- apply retries
- parse JSON
- map errors

### `core/errors.ts`

Owns `BrewApiError`.

### `core/retry.ts`

Owns retry policy.

### `core/idempotency.ts`

Owns automatic POST idempotency key generation.

### `resources/*`

Owns user facing methods only.
Keep these simple.

## Example SDK Usage

```ts
import { createBrewClient } from '@brew.new/sdk'

const brew = createBrewClient({
  apiKey: process.env.BREW_API_KEY!,
})

const created = await brew.contacts.upsert({
  email: 'jane@example.com',
  firstName: 'Jane',
  customFields: {
    plan: 'enterprise',
  },
})

const count = await brew.contacts.count({
  filter: {
    'customFields.plan': { equals: 'enterprise' },
  },
})

const fields = await brew.fields.list()
```

## README Outline For The SDK Repo

The SDK repo README should include.

1. what the SDK is
2. install
3. quick start
4. auth
5. contacts examples
6. fields examples
7. retries and idempotency
8. error handling
9. raw response mode
10. versioning policy

## Release Workflow

Recommended flow.

1. Public API contract changes in app repo
2. Generate OpenAPI in app repo
3. Copy or pull updated OpenAPI spec into SDK repo
4. Regenerate SDK wire types
5. Update hand written resource wrappers if needed
6. Run SDK tests
7. Publish SDK

## App Repo To SDK Repo Contract

Keep this line very clear.

- app repo owns Zod and generated OpenAPI
- docs repo owns Mintlify presentation
- SDK repo owns client ergonomics

That separation will keep the system healthy.

## Recommendation

Build the SDK as a thin but polished TypeScript client.

Best setup.

- Bun
- TypeScript
- OpenAPI generated types
- hand written ergonomic wrapper
- MSW based tests
- safe retries
- typed errors
- strong defaults

That should give excellent UX and DX without coupling the SDK to app internals.
