# OpenAPI strategy

How this SDK keeps its types honest to the Brew public API contract.

## Current state

Hand-rolled. Every type in `src/resources/*/types.ts` and every
`Input` / `Response` type inside a method file is authored by hand from
the plan doc (`public-api-sdk-oss-plan.md`) and reasonable assumptions
about the wire format. Each of these files is tagged with a
`TODO(openapi)` comment.

The SDK compiles, tests pass, and consumers get full type safety — but
the types are not guaranteed to match the real API until they are
regenerated from the spec.

## Target state: copy-and-generate

Same pattern used by Stripe, Linear, Resend, and Vercel:

```
openapi/
  public-api-v1.yaml           ← vendored copy of the spec, committed
src/
  generated/
    openapi-types.ts           ← generated, committed, never hand-edited
scripts/
  generate-types.ts            ← wrapper around openapi-typescript
```

### Wiring up, step by step

1. **Drop the spec in.** Copy the current `openapi/public-api-v1.yaml`
   from the app repo into `openapi/public-api-v1.yaml` here. Commit it
   in the same PR as the regeneration (step 4) so the two always move
   together.

2. **Install the generator.**

   ```bash
   bun add -d openapi-typescript
   ```

3. **Add a script to `package.json`:**

   ```json
   {
     "scripts": {
       "generate:types": "openapi-typescript openapi/public-api-v1.yaml -o src/generated/openapi-types.ts"
     }
   }
   ```

4. **Generate and commit.**

   ```bash
   bun run generate:types
   git add openapi/public-api-v1.yaml src/generated/openapi-types.ts
   git commit
   ```

5. **Replace hand-rolled types with re-exports.** Grep for
   `TODO(openapi)` and swap each hand-rolled domain type for a
   re-export from `src/generated/openapi-types.ts`. The method-facing
   names (`Contact`, `ContactField`, `UpsertContactInput`, etc.) should
   stay stable so resource files and test fixtures do not churn.

6. **Run the full check suite.**
   ```bash
   bun tsc
   bun lint
   bun run format
   bun run test
   bun run build
   ```

Any type mismatch introduced by the generated types will surface as
either a tsc error (resource file assigns to a field that no longer
exists) or a test failure (handler returns a shape the wire type does
not match). Fix them in the same PR.

## Why copy-and-generate

Three alternatives, all worse:

### 1. Live fetch at build time

Pros: always up-to-date.

Cons: CI flakes on network errors. Diffs are invisible — a new API
field appears in `dist/` with no corresponding git commit. You can never
answer "what changed between SDK 1.2 and 1.3?" without git archaeology
across two repos.

### 2. Git submodule / monorepo

Pros: zero drift, one repo to release.

Cons: tight coupling between the SDK and the app repo. Every SDK cut
becomes an app-repo release ritual. Open sourcing becomes messy because
the SDK history is entangled with internal app history.

### 3. Manual hand-rolling (status quo)

Pros: no tooling, no generator, no build step.

Cons: nothing catches drift. A field rename in the API is a silent
runtime 4xx on the next SDK release. This is fine for a scaffold; it is
not fine for a shipped SDK.

## Why manual sync (not an auto-PR)

A human should see every API change before it ships to SDK consumers.
Automating the "copy spec + regenerate + push" loop is tempting, but
every team that does it eventually gets burned by an upstream breaking
change silently landing in a new minor version.

The manual ritual is:

> "The app repo cut a new API minor. Copy the spec, regenerate, run the
> test suite, fix anything the compiler complains about, commit as one
> PR, tag an SDK release."

That ritual is ~15 minutes of work and produces a reviewable diff. The
automation saves the 15 minutes and produces nothing reviewable.

## Version alignment

The SDK major version tracks the public API major:

- Public API `v1` → SDK `1.x`
- Public API `v2` → SDK `2.x` (or a new namespace on the client)

Between API minor releases the SDK ships normal patch/minor bumps as
DX improves. The vendored spec filename should encode the major
(`public-api-v1.yaml`, `public-api-v2.yaml`) so we can hold old
generated types around during a migration period if needed.

## When the real spec lands

Delete this paragraph and update the "Current state" section above.
Every `TODO(openapi)` comment in the codebase becomes actionable and
should be resolved in the same PR that introduces the generator.
