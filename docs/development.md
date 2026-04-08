# Development

How to work on `@brew.new/sdk`. Read the **mental model** section first
if you're new — the cross-repo handshake is the part everyone forgets.

---

## Mental model

There are **two repos** that have to stay in sync:

```
brew-omni-agent-mvp                       brew-typescript-sdk
─────────────────────                     ───────────────────────
the Brew app                              this repo (the OSS SDK)

  lib/contacts/contracts.ts (Zod)
            │
            │  bun run openapi:generate
            ▼
  openapi/public-api-v1.yaml              openapi/public-api-v1.yaml
                                                    │
                                                    │  cp (manual)
                                                    ▼
                                          openapi/public-api-v1.yaml
                                                    │
                                                    │  bun run generate:types
                                                    ▼
                                          src/generated/openapi-types.ts
                                                    │
                                                    │  imported by
                                                    ▼
                                          src/resources/*/  + src/core/errors.ts
```

The **dependency direction is one-way**: Zod schemas in the app repo
are the source of truth, the YAML is generated from them, the SDK
types are generated from the YAML, and the SDK resource methods
import the types.

You **never edit** any of these files by hand:

- `brew-omni-agent-mvp/openapi/public-api-v1.yaml` (generated from Zod)
- `brew-typescript-sdk/openapi/public-api-v1.yaml` (vendored copy)
- `brew-typescript-sdk/src/generated/openapi-types.ts` (generated from YAML)

Two of those generated files are **committed to git** (the SDK's
copy of the YAML and the generated `.ts`) so every PR shows API
drift as a real diff. That's the whole point of the manual sync —
a human always sees what's about to ship.

### The repos sit side-by-side on disk

Both checkouts live under `~/Desktop/`:

```
~/Desktop/
├── brew-omni-agent-mvp/    ← the app repo (Zod, routes, tests, real backend)
└── brew-typescript-sdk/    ← this repo (the SDK that wraps the public API)
```

Most commands assume that layout. If your local layout differs, adjust
the relative path in the `cp` step below.

---

## End-to-end: shipping a new endpoint

This is the full flow from "I want to add `brew.contacts.archive(...)`"
all the way to "it ships on npm". Every step says **which repo /
which directory** you should be in. Read it once, follow it the next
time, you're done.

> **Heads up: the foundation is done.** Adding an endpoint never
> touches `src/core/*` (the transport, retries, error mapping,
> idempotency, abort handling, header construction, URL building,
> config resolution are all stable and tested) and never touches
> `src/types.ts` or `src/client.ts` (the public client surface and
> shared types are stable). You only touch:
>
> - `openapi/public-api-v1.yaml` (vendored copy, refreshed via `cp`)
> - `src/generated/openapi-types.ts` (regenerated, never hand-edited)
> - `src/resources/<resource>/<method>.ts` (new file)
> - `src/resources/<resource>/resource.ts` (3-line wire-up)
> - `src/index.ts` (re-export the new types)
> - `tests/resources/<resource>/<method>.test.ts` (new file)
> - `docs/<resource>.md` (new method section)
> - `package.json` + `src/version.ts` (version bump)
>
> If you find yourself editing anything under `src/core/`, stop —
> that's almost certainly a bug fix or a foundation improvement, not
> "adding an endpoint". Different review path, different scope.

### Step 1 — Make the API change in the app repo

```bash
cd ~/Desktop/brew-omni-agent-mvp
```

Add the new endpoint the way every other endpoint in the app is added:

1. Update or add a Zod schema in `lib/contacts/contracts.ts`
   (or the equivalent for whichever resource you're touching).
2. Add or update the route handler under `app/api/v1/<resource>/route.ts`.
3. Register the operation in `openapi/public-api-v1-<resource>.ts`
   so the OpenAPI generator picks it up.
4. Write the app-side tests (`bun run test:api`).

The app repo has its own conventions for this — follow them. Nothing
on the SDK side should change yet.

### Step 2 — Regenerate the YAML in the app repo

Still in the app repo:

```bash
cd ~/Desktop/brew-omni-agent-mvp
bun run openapi:generate
```

This rewrites `openapi/public-api-v1.yaml` from the Zod schemas you
just touched. Open the file (or `git diff openapi/public-api-v1.yaml`)
and verify your new operation is actually in there. **If the YAML
diff looks wrong here, stop.** Do not move to the SDK side until the
app-side regen produces what you expect.

Commit the YAML change in the app repo (or stage it for the same
PR as the Zod changes — same rules as any other commit there).

### Step 3 — Switch to the SDK repo

```bash
cd ~/Desktop/brew-typescript-sdk
```

From here on out, every command runs in the SDK repo.

### Step 4 — Copy the new YAML into the SDK

```bash
cp ../brew-omni-agent-mvp/openapi/public-api-v1.yaml openapi/public-api-v1.yaml
```

The SDK keeps its own vendored copy. This is the **manual handshake**
between the two repos. No automation, no GitHub Action — a human
always sees the diff.

Run `git diff openapi/public-api-v1.yaml` and skim it. You should see
exactly the changes you made in the app repo, no more, no less. If
there's surprise drift in there, investigate before regenerating.

### Step 5 — Regenerate the SDK's TypeScript types

```bash
bun run generate:types
```

This runs `openapi-typescript` against the vendored YAML and rewrites
`src/generated/openapi-types.ts`. Open that file and search for the
new operation — you should see it under both `paths` and `operations`,
and any new schemas under `components.schemas`.

Commit the regenerated `.ts` file. From now on, every type you write
in resource methods should derive from this file.

### Step 6 — Add the SDK resource method

The SDK uses **one file per method** under `src/resources/<resource>/`.
For our `archive` example:

```ts
// src/resources/contacts/archive.ts

import type { components } from '../../generated/openapi-types'
import type { HttpClient } from '../../core/http'
import type { RequestOptions } from '../../types'

export type ArchiveContactInput =
  components['schemas']['ContactsArchiveRequest']
export type ArchiveContactResponse =
  components['schemas']['ContactsArchiveResponse']

/**
 * Archive a contact by email. Soft delete — the contact is hidden from
 * lists but recoverable.
 */
export function createArchiveContact(client: HttpClient) {
  return async (
    input: ArchiveContactInput,
    options?: RequestOptions
  ): Promise<ArchiveContactResponse> => {
    const response = await client.request<ArchiveContactResponse>({
      method: 'POST',
      path: '/v1/contacts/archive',
      body: input,
      ...(options ? { options } : {}),
    })
    return response.data
  }
}
```

The pattern: import generated types, take an `HttpClient` in a
factory closure, return an async function that calls
`client.request(...)` and returns the unwrapped data. The transport
already handles retries, errors, idempotency, abort, headers, and
URL building — the resource method is a thin shim.

### Step 7 — Wire the new method into the resource factory

```ts
// src/resources/contacts/resource.ts

import { createArchiveContact } from './archive'

export type ContactsResource = {
  // ...existing methods
  readonly archive: ReturnType<typeof createArchiveContact>
}

export function createContactsResource(client: HttpClient): ContactsResource {
  return {
    // ...existing wire-ups
    archive: createArchiveContact(client),
  }
}
```

Two lines added: the type, and the wire-up in the factory return
object. That's it — `brew.contacts.archive(...)` now exists on the
public client.

### Step 8 — Re-export the public types from `src/index.ts`

```ts
// src/index.ts
export type {
  ArchiveContactInput,
  ArchiveContactResponse,
} from './resources/contacts/archive'
```

If consumers might want to type a parameter or return value
explicitly in their own code, the type needs to be exported from
the public barrel. Anything not re-exported here is private and may
change without a major version bump.

### Step 9 — Write the test

The SDK is TDD — write the test first, watch it fail, then write the
implementation. (For Step 6 above this means Step 9 actually comes
BEFORE Step 6 in practice, but documenting it in this order keeps the
flow chronological. Mentally swap them.)

```ts
// tests/resources/contacts/archive.test.ts

import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createArchiveContact } from '../../../src/resources/contacts/archive'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('contacts.archive', () => {
  it('sends POST /v1/contacts/archive with { email } body', async () => {
    let capturedBody: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/contacts/archive',
        async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json({ archived: true }, { status: 200 })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const archive = createArchiveContact(client)

    const result = await archive({ email: 'jane@example.com' })

    expect(capturedBody).toEqual({ email: 'jane@example.com' })
    expect(result.archived).toBe(true)
  })
})
```

`makeTestHttpClient` from `tests/helpers/http-client.ts` is the
shared harness that wires up an http client with fake-sleep retry
tuning so tests run instantly. Use it everywhere.

### Step 10 — Document the new method

Add a section to `docs/contacts.md` (or whichever resource doc) with:

- Method signature
- Input + response types
- A runnable example
- Any edge cases (retry behavior, idempotency, error codes)

Match the style of the existing entries. The doc is the user-facing
reference — every new method needs one.

### Step 11 — Run the four checks

```bash
bun tsc
bun lint
bun run format
bun run test
```

All four must be green. `bun run test` (NOT `bun test` — see the
gotchas section below).

If `bun tsc` fails because the generated types changed something
the resource method depended on, fix the resource method. If the
test fails, fix the test fixture or the implementation. The flow
naturally surfaces drift at exactly the right place.

### Step 12 — Bump the SDK version

```ts
// src/version.ts
export const SDK_VERSION = '0.1.0-alpha.1' // bump from 0.1.0-alpha.0
```

```json
// package.json
"version": "0.1.0-alpha.1"
```

Both files. They are not auto-synced — bump both in the same commit.
(`SDK_VERSION` from `src/version.ts` flows into the default
`User-Agent` header, so the bump propagates automatically once you
update the constant.)

### Step 13 — Commit everything as ONE PR

```bash
git add -A
git commit -m "Add contacts.archive endpoint"
```

The single commit/PR should include:

- The vendored YAML (`openapi/public-api-v1.yaml`)
- The regenerated types (`src/generated/openapi-types.ts`)
- The new resource method file (`src/resources/contacts/archive.ts`)
- The resource factory wire-up (`src/resources/contacts/resource.ts`)
- The new public exports (`src/index.ts`)
- The new test file (`tests/resources/contacts/archive.test.ts`)
- The new doc section (`docs/contacts.md`)
- The version bump (`package.json` + `src/version.ts`)

Reviewers can read the diff top-to-bottom and see the full
end-to-end change in one place.

### Step 14 — Publish

```bash
npm publish --tag alpha   # for alpha versions
# or
npm publish               # for stable versions
```

`prepublishOnly` runs `bun run clean && bun run generate:types && bun tsc && bun lint && bun run test && bun run build` first as a safety net. If any of those fail, the publish aborts before uploading.

Tag the git commit:

```bash
git tag v$(node -p "require('./package.json').version")
git push origin --tags
```

Done. The new endpoint is on npm. Consumers running
`bun update @brew.new/sdk` will pick it up.

---

## Updating an existing endpoint

When the upstream API changes the shape of a field (rename, type
change, new required field, etc.) the flow is shorter — Steps 1, 2,
3, 4, 5, 11, 12, 13, 14 from above. You skip the "add a new resource
method file" steps because the file already exists; you just have to
fix it once tsc tells you what broke.

The drill:

1. App repo: change the Zod schema, update routes/tests, run
   `bun run openapi:generate`.
2. SDK repo: copy the YAML, run `bun run generate:types`.
3. Run `bun tsc` — every drift point shows up as a type error.
4. Fix each one. They're usually one-line edits in resource methods
   or test fixtures.
5. Run the rest of the four checks. Bump version. Commit. Publish.

---

## Local SDK-only setup (no API change involved)

For DX improvements, refactors, doc fixes, or anything that doesn't
touch the API contract:

```bash
git clone https://github.com/GetBrew/brew-typescript-sdk.git
cd brew-typescript-sdk
bun install
```

You don't need the omni-agent repo cloned for SDK-only work. The
vendored YAML + generated types are committed to this repo.

### The four checks

Run these before every commit. They're wired into `prepublishOnly`
so the publish flow can never ship a broken build:

```bash
bun tsc         # typecheck (strict, exactOptionalPropertyTypes, noUncheckedIndexedAccess)
bun lint        # eslint flat config + typescript-eslint recommendedTypeChecked
bun run format  # prettier
bun run test    # vitest — NEVER `bun test`, see the gotchas section
```

### TDD contract

Every change to `src/` is driven red → green:

1. Write the test first.
2. `bun run test` — confirm it fails.
3. Write the implementation.
4. `bun run test` — confirm it passes.
5. Refactor if needed, keep it green.

The fail-then-pass cycle is mandatory, including for "trivial" pure
functions. Catching bugs in tests is cheap; catching them in
production is expensive.

Trivially correct one-liners (returning a constant, re-exporting a
type) don't need dedicated tests — use judgment, the bar is "does a
test here catch real bugs?", not "every line has an assertion".

Full conventions live in [`AGENTS.md`](../AGENTS.md).

### Build

```bash
bun run build
```

Runs `tsup` and emits to `dist/`:

- `dist/index.js` (ESM)
- `dist/index.cjs` (CJS)
- `dist/index.d.ts` + `dist/index.d.cts` (TypeScript declarations)
- Sourcemaps for all of the above

The published npm tarball ships only `dist/`, `README.md`, and
`LICENSE` (see `files` in `package.json`). Source files, tests, and
docs stay out of the tarball.

### Smoke testing against a real Brew API

The MSW tests prove the SDK sends what it claims and parses what the
spec says, but to verify end-to-end that the SDK actually round-trips
against a live server, point it at a real environment with a temp
script. Read-only operations only.

```bash
# In a temp file (NOT committed) at /tmp/smoke.ts:
import { createBrewClient } from '/path/to/brew-typescript-sdk/dist/index.js'

const brew = createBrewClient({
  apiKey: process.env.BREW_API_KEY!,
  baseUrl: process.env.BREW_API_URL ?? 'http://localhost:3000/api',
})

console.log(await brew.contacts.count())
console.log(await brew.contacts.list({ limit: 3 }))
console.log(await brew.fields.list())
```

```bash
bun run build  # make sure dist/ is fresh
BREW_API_KEY=brew_xxx BREW_API_URL=http://localhost:3000/api bun run /tmp/smoke.ts
```

If the dev backend is running on `localhost:3000`, point at that. If
you're testing against staging or prod, swap the URL — but stick to
read-only methods (`list`, `count`, `getByEmail`, `fields.list`)
unless you've explicitly set up a test workspace where deletes are
safe.

Delete the temp file when you're done. Never commit API keys.

---

## Why we don't auto-sync the spec

Tempting but dangerous. Auto-syncing the YAML on every upstream
change would let breaking renames silently land in a published SDK
version. The manual `cp` step is the **feature** — it forces a human
to look at the diff before the change ships to npm consumers.

For a 2-person team the manual ritual costs ~5 minutes per release
and saves an unbounded amount of "why is everyone's `contact.email`
suddenly undefined?" debugging. Worth it.

---

## Repo layout

```
src/
├── index.ts                    Public barrel — every consumer-facing export
├── client.ts                   createBrewClient factory
├── version.ts                  SDK_NAME + SDK_VERSION (keep in sync with package.json)
├── types.ts                    Public types (BrewClientConfig, RequestOptions, BrewErrorEnvelope)
├── generated/
│   └── openapi-types.ts        ⚠️  AUTO-GENERATED — never hand-edit
├── core/
│   ├── http.ts                 The transport (fetch + retries + errors + idempotency)
│   ├── errors.ts               BrewApiError + envelope mapping
│   ├── url.ts                  buildUrl (path params + query serialization)
│   ├── headers.ts              buildHeaders (auth + content-type + idempotency-key)
│   ├── retry.ts                shouldRetry matrix + computeBackoff
│   ├── idempotency.ts          generateIdempotencyKey + resolveIdempotencyKey
│   └── config.ts               resolveConfig with defaults + late-binding fetch
└── resources/
    ├── contacts/               One file per method + types.ts + resource.ts
    └── fields/                 Same pattern

tests/
├── integration.test.ts         End-to-end through createBrewClient
├── msw-smoke.test.ts           MSW plumbing sanity check
├── setup.ts                    vitest + MSW lifecycle wiring
├── helpers/http-client.ts      Shared test harness (makeTestHttpClient)
├── msw/{server,handlers}.ts    Shared setupServer instance
├── core/                       Unit tests for every core/ file
└── resources/                  One test file per resource method

docs/                           User + contributor reference (this folder)
openapi/
└── public-api-v1.yaml          Vendored copy of the upstream spec (committed)
```

---

## Common gotchas

- **`bun test` ≠ `bun run test`.** The first invokes Bun's built-in
  runner which bypasses vitest config. Always use `bun run test`,
  always with `run`.

- **`createdAt` and `updatedAt` are `number`, not `string`.** The
  spec emits them as UNIX millisecond timestamps. Convert with
  `new Date(contact.createdAt)`.

- **Field types are `'bool'`, not `'boolean'`.** And there is no
  `'array'` type. The wire vocabulary is `'string' | 'number' |
'date' | 'bool'`. Mirror it exactly.

- **`SDK_VERSION` in `src/version.ts` and `version` in `package.json`
  must be bumped together.** No auto-sync. The constant is the
  source of truth for the User-Agent header.

- **Don't edit `src/generated/openapi-types.ts`.** Edit the spec
  upstream, regenerate, copy over, regenerate here. Hand-edits will
  be silently overwritten on the next `bun run generate:types`.

- **Don't edit `openapi/public-api-v1.yaml` either.** Same rule —
  it's a vendored copy of a generated file. The source of truth
  lives in `brew-omni-agent-mvp/lib/contacts/contracts.ts` and the
  Zod schemas there.

- **The SDK's resource method exists ONLY after the spec ships.**
  You can't add `brew.contacts.archive(...)` to the SDK without
  first adding `archive` to the app repo's Zod + routes + YAML. The
  dependency is one-way.

- **PATCH is never retried, even with an idempotency key.** PATCH
  is a partial-update primitive and the server's view of "current
  state" may have shifted between attempts. See `core/retry.ts` for
  the rationale. If you need PATCH-with-retries, do a fresh
  `getByEmail` first to re-read state, then issue the PATCH.

- **The SDK ships a copy of the spec, not a reference to it.** No
  network dependency at install time, no surprise updates. Spec
  changes only land via deliberate PRs.
