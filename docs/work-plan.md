# Work Plan

How we ship `@brew/api`. This document lays out the phase order, what's
sequential vs. parallel, and the TDD contract for every unit.

> **Philosophy**: a narrow sequential spine with two wide parallel fans. Most
> of the SDK is pure functions. They don't need MSW. They don't even need
> `fetch`. That's a huge parallelization surface. The only true bottleneck is
> `core/http.ts` — everything upstream can be built in parallel, and
> everything downstream depends on `http.ts` being solid first.

## TDD contract

Every file under `src/` — including pure ones — is driven by failing tests.

1. Write the test first.
2. Run it. **Confirm it fails** (red).
3. Write the minimum implementation.
4. Run it. **Confirm it passes** (green).
5. Refactor if needed, keeping the test green.

The fail-then-pass cycle must actually happen. Do not skip it.

Exceptions: trivially correct one-liners (returning a constant, re-exporting
a type) don't need dedicated tests. Use judgment — the bar is "does a test
here catch real bugs?", not "does every line have a matching assertion?".

All tests use `vitest`. HTTP behavior is tested with MSW (`msw/node` +
`setupServer`).

## Phase order (big picture)

```
Phase 0: MSW infra + type seed      [sequential, tiny]
         │
         ▼
Phase 1: Pure units                 [WIDE PARALLEL — 6 tracks]
         │  (all pure, no fetch, no MSW)
         ▼
Phase 2: core/http.ts               [sequential — the bottleneck]
         │  (this is where MSW finally gets used)
         ▼
Phase 3: Resources                  [PARALLEL — 2 tracks]
         │
         ▼
Phase 4: Client assembly + polish   [sequential, small]
```

---

## Phase 0 — Foundation (sequential)

One worker. Must land before anyone starts Phase 1.

### Deliverables

1. `bun add -D msw` — latest v2.
2. `tests/msw/server.ts` exporting a configured `setupServer(...)`.
3. `tests/msw/handlers.ts` with default handlers (empty array for now — per-test `server.use(...)` is the primary pattern).
4. `tests/setup.ts` wiring MSW lifecycle into vitest:
   - `beforeAll(server.listen({ onUnhandledRequest: 'error' }))`
   - `afterEach(server.resetHandlers)`
   - `afterAll(server.close)`
5. `vitest.config.ts` updated with `setupFiles: ['./tests/setup.ts']`.
6. **Smoke test** — one dummy handler + one real `fetch('https://brew.new/...')` call proves MSW is actually intercepting. This is the only test in Phase 0 but it protects every Phase 1+ track from chasing ghost failures later.
7. `src/types.ts` — the public type seed: `BrewClientConfig`, `RequestOptions`, `BrewHttpMethod`, shared envelope shapes. Single source of truth every Phase 1 track imports from.

### Blocks Phase 1 until

- MSW smoke test is green.
- `types.ts` is committed.

### Note on OpenAPI generated types

Do **not** block on this. Hand-roll the minimum types we need in `types.ts`,
flag TODOs, replace with generated types in a later sweep. Pulling the spec
out of the app repo + wiring `openapi-typescript` is a whole side quest that
would serialize everything.

---

## Phase 1 — Pure units (6 parallel tracks, full TDD)

Each track owns exactly one file in `src/core/`. Zero cross-track writes →
zero merge conflicts. Each is pure (no `fetch`, no MSW) → tests are pure
vitest with input→output assertions.

| Track | File                      | TDD surface                                                                                                                                   |
| ----- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** | `src/core/errors.ts`      | `BrewApiError` class; `fromResponse({ status, headers, body })` mapping; preserve `code`/`type`/`requestId`/`retryAfter`/`docs`/`suggestion`. |
| **B** | `src/core/url.ts`         | `buildUrl({ baseUrl, path, pathParams, query })`; query serialization (arrays, filters, cursor, limit); path-param substitution; encoding.    |
| **C** | `src/core/headers.ts`     | `buildHeaders({ apiKey, idempotencyKey?, userAgent?, extras })`; `Authorization: Bearer`; content-type; merging extras.                       |
| **D** | `src/core/retry.ts`       | `shouldRetry({ method, status, attempt, maxRetries, error })` matrix; `computeBackoff({ attempt, baseMs, maxMs, retryAfterMs, jitter })`.     |
| **E** | `src/core/idempotency.ts` | `generateIdempotencyKey()` via `crypto.randomUUID()`; `resolveIdempotencyKey({ method, provided })` — POST only, provided wins.               |
| **F** | `src/core/config.ts`      | `resolveConfig({ userConfig })` → defaults for `baseUrl`, `timeoutMs: 30_000`, `maxRetries: 2`, `userAgent`, `fetch`; `apiKey` validation.    |

### Retry matrix (reference for Track D)

Retry on:

- network failures
- `408`, `429`, `500`, `502`, `503`, `504`

Do **not** retry on:

- `400`, `401`, `403`, `404`, `409`, `422`

Method policy:

- `GET` retries by default
- `DELETE` retries by default
- `POST` retries only when an idempotency key is attached
- `PATCH` does not retry by default

`Retry-After` from the response overrides computed backoff when present.

### Coordination

All six tracks merge back to `main` individually. When all six are green,
Phase 2 unblocks. Do not start Phase 2 partially — the sequential piece
benefits from having every unit stable.

---

## Phase 2 — `core/http.ts` (sequential, the real bottleneck)

One worker. This is the only place the whole SDK has to think about
end-to-end behavior, and it's where MSW starts mattering. TDD with vitest +
MSW handlers defined inline per test.

### Behaviors to drive via failing tests (in order)

1. Sends the right URL (uses `url.ts`).
2. Sends the right headers — auth + user-agent (uses `headers.ts`).
3. Serializes JSON request body.
4. Parses JSON success response, returns typed data.
5. Non-2xx responses → throws a typed `BrewApiError` with full envelope mapping (uses `errors.ts`).
6. Retries `5xx` / `429` / `408` / network failures per policy (uses `retry.ts`). **Use closure-counter handlers, not `{ once: true }`** — per the MSW notes, intra-call `once` ordering is ambiguous.
7. Honors `Retry-After` header on `429`.
8. `POST` auto-generates `Idempotency-Key` unless caller provides one (uses `idempotency.ts`).
9. Respects `timeoutMs` via `AbortController`.
10. Respects caller-passed `signal` (merges with internal timeout signal).
11. `raw: true` option returns `{ data, status, headers, requestId }`.
12. Custom `fetch` injection from config is used instead of global fetch.
13. `maxRetries` cap is honored (doesn't loop forever).

Each item = one failing test → implementation → green. ~13 tests. This is
the longest single-person track but it's where the SDK's correctness lives.

### Blocks Phase 3 until

- All transport tests green.
- `http.ts` exports a single `request({ method, path, ... })` function
  that resources will thin-wrap.

---

## Phase 3 — Resources (2 parallel tracks)

Once `http.ts` is stable, resources are thin wrappers. Two workers, zero
coordination.

| Track | File                        | Methods                                                                                |
| ----- | --------------------------- | -------------------------------------------------------------------------------------- |
| **A** | `src/resources/contacts.ts` | `list`, `count`, `getByEmail`, `upsert`, `upsertMany`, `patch`, `delete`, `deleteMany` |
| **B** | `src/resources/fields.ts`   | `list`, `create`, `delete`                                                             |

Each method is 2–5 lines: build input → call `http.request(...)` → return.
TDD per method with MSW, mostly asserting "this method hits the right URL,
with the right body, and maps the response". Resource tests stay thin
because transport-level coverage already lives in Phase 2.

**Optional third parallel track**: `tests/integration.test.ts` — end-to-end
flows against what'll eventually be `createBrewClient`. Can start as soon as
Phase 2 is green.

---

## Phase 4 — Client assembly + polish (sequential)

One worker.

1. `src/client.ts` — `createBrewClient({ apiKey, ... })` → `{ contacts, fields }`.
2. `src/index.ts` — public re-exports: `createBrewClient`, `BrewApiError`, public types, `SDK_VERSION`.
3. Integration test — one end-to-end happy path + one end-to-end error path through `createBrewClient`.
4. README update with real code from the tests.
5. `bun run build` dry run — confirm `dist/` shape, exports, `.d.ts` emission.
6. `package.json` version bump to `0.1.0-alpha.0`.

---

## Dependency graph

```
types.ts ──┬─► errors.ts ───────┐
           ├─► url.ts ──────────┤
           ├─► headers.ts ──────┤
           ├─► retry.ts ────────┼──► http.ts ──┬─► contacts.ts ──┐
           ├─► idempotency.ts ──┤              └─► fields.ts ────┼──► client.ts ──► index.ts
           └─► config.ts ───────┘                                 │
                                                                   │
                                                    integration.test.ts (parallel with contacts/fields)
```

## Parallelization summary

| Phase | Workers (max useful) | Sequential or parallel? | Why                                                      |
| ----- | -------------------- | ----------------------- | -------------------------------------------------------- |
| 0     | 1                    | sequential              | Everyone else depends on MSW infra + `types.ts`.         |
| 1     | **6**                | parallel                | Pure units, distinct files, no cross-dependencies.       |
| 2     | 1                    | sequential              | Single file, touches everything, correctness bottleneck. |
| 3     | **2 (or 3)**         | parallel                | Two resource files + optional integration track.         |
| 4     | 1                    | sequential              | Small assembly + polish.                                 |

**Peak parallelism: 6 workers during Phase 1.**

## Solo-worker serialization

If only one worker is available, here's the chronological order that
minimizes rework:

1. Phase 0 (MSW infra + `types.ts` + smoke test)
2. `errors.ts` → `url.ts` → `headers.ts` → `retry.ts` → `idempotency.ts` → `config.ts`
3. `http.ts` (Phase 2)
4. `contacts.ts` → `fields.ts`
5. `client.ts` → `index.ts` → integration test → README → build check

## Post-work checklist

Run all four on every phase boundary before committing:

```bash
bun tsc
bun lint
bun run format
bun test
```

All four must pass cleanly. No warnings, no skipped checks.
