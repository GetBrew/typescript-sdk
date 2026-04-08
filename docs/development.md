# Development

How to work on `@brew.new/sdk` locally and how to keep the types
honest to the upstream API.

## Local setup

```bash
git clone https://github.com/GetBrew/brew-typescript-sdk.git
cd brew-typescript-sdk
bun install
```

## The four checks

Run these on every change. They run in seconds and are wired into
`prepublishOnly` so the publish flow can never ship a broken build:

```bash
bun tsc         # typecheck (strict, exactOptionalPropertyTypes, noUncheckedIndexedAccess)
bun lint        # eslint flat config + typescript-eslint recommendedTypeChecked
bun run format  # prettier
bun run test    # vitest — NEVER `bun test`, that hits Bun's built-in runner and bypasses MSW
```

`bun run test` (with `run`) is mandatory. Bun's built-in `bun test`
runner ignores `vitest.config.ts` and `tests/setup.ts`, so MSW never
starts and HTTP tests silently fail. This trap is documented inside
the file output of every check sweep too.

## TDD contract

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

## Build

```bash
bun run build
```

Runs `tsup` and emits to `dist/`:

- `dist/index.js` (ESM)
- `dist/index.cjs` (CJS)
- `dist/index.d.ts` + `dist/index.d.cts` (TypeScript declarations for both)
- Sourcemaps for all of the above

The published npm tarball ships only `dist/`, `README.md`, and
`LICENSE` (see `files` in `package.json`). Source files, tests, and
docs stay out.

## Keeping types honest: the OpenAPI sync ritual

This is the most important workflow in the repo. The SDK's types are
**generated from the upstream OpenAPI spec**, not hand-rolled. Type
drift is the most dangerous failure mode for an SDK — a renamed field
in the API can silently ship to npm and break every consumer in
production. The generation pipeline is the safety net.

### How it works

1. The Brew app repo (`brew-omni-agent-mvp`) holds the source of
   truth at `openapi/public-api-v1.yaml`. That file is generated from
   the app's Zod contracts via `bun run openapi:generate` in the app
   repo. You do not edit it by hand.

2. The SDK repo holds a **vendored copy** of that spec at
   `openapi/public-api-v1.yaml`. This file is committed to git so
   every PR shows API drift as a real diff.

3. `src/generated/openapi-types.ts` is generated from the vendored
   spec by `openapi-typescript`. This file is also committed.

4. Every hand-rolled type that touches a public API shape derives
   from `src/generated/openapi-types.ts`. Look for
   `import type { components, paths } from '../../generated/openapi-types'`
   in the resource files.

When the API contract changes upstream, the entire chain has to be
re-run deliberately by a human. This is the ritual:

### The release ritual (when the upstream API changes)

```bash
# 1. Copy the latest spec from the app repo into the SDK repo.
#    Adjust the path if your local layout differs.
cp ../brew-omni-agent-mvp/openapi/public-api-v1.yaml openapi/public-api-v1.yaml

# 2. Regenerate the TypeScript types from the new spec.
bun run generate:types

# 3. Run tsc. Anything the upstream changed shows up as a type error
#    in the resource methods or tests that consume the changed shape.
bun tsc

# 4. Fix every tsc error. Usually this is renaming a field or adjusting
#    a response shape — the compiler tells you exactly where.

# 5. Run the test suite. Some test fixtures may need to be updated to
#    match the new wire format.
bun run test

# 6. Run the rest of the check sweep.
bun lint
bun run format

# 7. Bump the SDK version in package.json AND src/version.ts.
#    They are not auto-synced — bump both in the same commit.

# 8. Commit the spec, the regenerated types, the resource fixes, the
#    test fixture updates, and the version bump as ONE PR.

# 9. Publish.
npm publish --tag alpha   # for alpha releases
# OR
npm publish               # for stable releases
```

The whole loop usually takes 5–15 minutes when the API change is
small. The longest step is reading the diff of `openapi-types.ts` to
understand what actually changed.

### Why we don't auto-sync

Tempting but dangerous. Auto-syncing the spec on every upstream
change would let breaking renames silently land in a published SDK
version. The manual `cp` step is the **feature** — it forces a human
to look at the diff before the change ships to npm consumers.

For a 2-person team, the manual ritual costs ~5 minutes per release
and saves an unbounded amount of "why is everyone's contact.email
suddenly undefined?" debugging.

### When NOT to regenerate

- Mid-PR if you're working on something unrelated to the API contract.
  Don't drag spec changes into a feature PR; that's how unintended
  surprises ship.
- Right before a release if you don't have time to actually fix
  everything that breaks. Plan the regen as its own PR if it's likely
  to be invasive.

### Inspecting drift before regenerating

If you want to preview what would change before pulling the trigger:

```bash
# Diff the SDK's vendored spec against the app repo's current spec
diff openapi/public-api-v1.yaml ../brew-omni-agent-mvp/openapi/public-api-v1.yaml

# Or check git history of the upstream spec
cd ../brew-omni-agent-mvp && git log --oneline openapi/public-api-v1.yaml
```

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

## Adding a new endpoint

When the upstream API gains a new endpoint, the SDK side is roughly:

1. Sync the spec (see the OpenAPI ritual above) — this updates
   `src/generated/openapi-types.ts` to include the new operation.
2. Pick the resource folder it belongs to (or create a new one under
   `src/resources/<name>/`).
3. Create `src/resources/<resource>/<method>.ts` with the factory:

   ```ts
   import type { components } from '../../generated/openapi-types'
   import type { HttpClient } from '../../core/http'

   export type FooInput = components['schemas']['FooRequest']
   export type FooResponse = components['schemas']['FooResponse']

   export function createFoo(client: HttpClient) {
     return async (input: FooInput): Promise<FooResponse> => {
       const response = await client.request<FooResponse>({
         method: 'POST',
         path: '/v1/foo',
         body: input,
       })
       return response.data
     }
   }
   ```

4. Wire it into `src/resources/<resource>/resource.ts`:

   ```ts
   import { createFoo } from './foo'

   export type FooResource = {
     // ... existing methods
     readonly foo: ReturnType<typeof createFoo>
   }

   export function createFooResource(client: HttpClient): FooResource {
     return {
       // ... existing
       foo: createFoo(client),
     }
   }
   ```

5. Re-export the public types from `src/index.ts`.
6. Write `tests/resources/<resource>/<method>.test.ts` mirroring the
   existing pattern. Use `makeTestHttpClient` from
   `tests/helpers/http-client.ts`.
7. Document the new method in `docs/<resource>.md`.
8. Run all four checks. Commit.

The SDK's transport, retries, errors, idempotency handling, abort
support, config resolution, and types are all locked in — adding a
new endpoint never touches any of them.

## Common gotchas

- **`bun test` ≠ `bun run test`.** The first invokes Bun's built-in
  runner which bypasses vitest config. Always use `bun run test`.
- **`createdAt` and `updatedAt` are `number`, not `string`.** The
  spec emits them as UNIX millisecond timestamps. Convert with
  `new Date(contact.createdAt)`.
- **Field types are `'bool'`, not `'boolean'`.** And there is no
  `'array'` type. Mirror the wire vocabulary.
- **`SDK_VERSION` in `src/version.ts` and `version` in `package.json`
  must be bumped together.** No auto-sync.
- **Don't edit `src/generated/openapi-types.ts`.** Edit the spec
  upstream and regenerate. Hand-edits will be silently overwritten on
  the next `bun run generate:types`.
