# Agents

Guidelines for any agent (human or AI) working inside `@brew.new/sdk`, the
official TypeScript SDK for the Brew public API.

## What this package is

A thin, ergonomic, open source TypeScript client on top of the Brew public
API. The API is the source of truth — this SDK is a consumer of it.

See `README.md` for the product-level overview and the external design doc
(`public-api-sdk-oss-plan.md`) for the full rationale.

For shipping a new version (iterate loop, validation, npm publish, the
tag-driven release workflow, and token rotation), read [`RELEASING.md`](./RELEASING.md)
end-to-end before touching `package.json#version` or pushing a `v*` tag.

## Testing

All functional work is test-driven.

1. Write the test first.
2. Run it and **confirm it fails**.
3. Write the minimum implementation to make it pass.
4. Run the test again and **confirm it passes**.
5. Refactor if needed, keeping the test green.

The fail-then-pass cycle must happen. Do not skip it.

Tests use `vitest`. Network behavior is tested with MSW
(`tests/msw/`, `onUnhandledRequest: 'error'`).

MSW cannot express the BODY phase of a response: a mocked stream ignores
the request signal, a socket reset cannot be mocked, and a passthrough
response comes back tee'd (MSW keeps a `clone()`), so cancelling it does
not reach the socket. Deadlines and cancels while a body streams, drops
after the headers, and releasing a discarded attempt are tested against a
real server: `tests/helpers/loopback-server.ts` (it registers the MSW
`passthrough()` for its own origin). A body-phase test must PROVE the
headers arrived first — use `afterHeaders()` — and set a per-test
`timeout`, because a regression there hangs instead of failing.

Do not hit the real Brew API from tests. The app repo already owns real
API integration coverage.

## Function signatures

Every function takes a single object parameter, even if it only needs one
value. This keeps call sites self-documenting and type-safe:

```ts
// Good
function getContact({ email }: { email: string }) { ... }

// Bad
function getContact(email: string) { ... }
```

Public SDK methods take `(input, options?)` where `input` is the domain
object and `options` is `RequestOptions`, with one deliberate exception: a
method that acts on ONE resource by identity takes that identifier
positionally, then `options?` — `emails.get(emailId, { include })`,
`sends.cancel(sendId)`, `automations.runs.cancel(automationRunId, { reason })`,
`emails.inboxPlacementTests.get(emailId, testId)`. The identity rides the URL
path on the wire, so there is no domain object to name it in; wrapping a single
string in `{ emailId }` would make every detail read read worse than the REST
call it stands for. Anything with a request body or a query still takes the
object.

## Async patterns

- Prefer parallel execution with `Promise.all` when all calls must succeed,
  or `Promise.allSettled` when partial failure is acceptable. Do not await
  independent promises sequentially.
- `no-await-in-loop` is enforced by lint. If you need to iterate with a side
  effect that has to be awaited, do it deliberately and comment why.
- All promises must be `await`ed or explicitly consumed. No dangling
  promises.

## Error handling

Every failure a public method gives up on is typed (`docs/errors.md`):

- `BrewApiError` — the server answered non-2xx: `status`, `code`, `type`,
  `requestId`, `retryAfter`, `suggestion` / `docs`, `details`, `body`,
  plus `bodyError` when the envelope was cut off and `idempotencyKey`.
- `BrewTransportError` → `BrewTimeoutError` / `BrewConnectionError` — no
  usable answer (deadline, failed or dropped connection). Never a
  `BrewApiError`: there is no status to report, and the public docs route
  `BrewApiError` and plain `Error` down different branches.
- `BrewParseError` — a complete 2xx body that is not JSON.
- A caller abort rethrows the signal's `reason` verbatim — the one value a
  public path throws that may not be an `Error`, because `fetch` does the
  same and callers compare against it.

Never throw bare `Error` from public code paths. Never swallow errors
silently.

## Retries

Retries are centralized in `src/core/retry.ts` and applied by the HTTP layer.
Do not scatter retry loops across resources. Rules:

- Retry on connection failures (including a body that breaks after the
  headers), `408`, `429`, `5xx`, and timeouts unless `retryOnTimeout` is
  `false`.
- Do not retry on `4xx` other than the above.
- Never retry a caller abort (whatever its `reason`) or a malformed 2xx.
- `GET` / `DELETE` are safe to retry by default.
- `POST` is only retried when an idempotency key is attached — the same
  key on every attempt.
- `PATCH` is not retried by default.
- Honor `Retry-After` up to 60 s (`MAX_RETRY_AFTER_MS`); beyond it, throw.
- Exponential backoff with jitter. Boring and predictable.

`src/core/http.ts` rules that exist because breaking them caused real
bugs:

- A deadline and a caller signal bound the WHOLE attempt, body included.
  Never clear a timer or detach a signal when `fetch` resolves — that is
  when the headers arrive, not the body. Attribute a failure by signal
  state (`classifyFailure`), never by `error.name`.
- Read bodies through `readTextWithin`, never `response.text()`: `text()`
  locks the stream so nothing can cancel it.
- Before retrying, abort the discarded attempt's signal and cancel its
  body, so its connection closes now rather than at garbage collection.

## Idempotency

POST requests auto-generate an `Idempotency-Key` unless the caller provides
one. This is what makes `POST` safe to retry. Callers can override it per
request via `RequestOptions.idempotencyKey`.

## Resource design

Resource clients live in `src/resources/`. They expose ergonomic method
names even when the raw API is more flexible. Example:

```ts
brew.contacts.getByEmail(...)
brew.contacts.upsert(...)
brew.contacts.upsertMany(...)
```

Resource files should be thin. All shared behavior (URL building, auth,
retries, error mapping, response parsing) lives in `src/core/`. Resources
should look like a short list of method definitions.

## Style

- No `any`. No untyped escape hatches. If you reach for `as unknown as T`,
  stop and rethink the type.
- No nested ternaries. Use early returns or extract a helper.
- Prefer `readonly` on arrays and object fields that should not mutate.
- Use `import type { ... }` / inline `type` imports for type-only imports.
- Boolean variables must start with `is`, `should`, `has`, `are`, `can`, or
  `was` (enforced by lint).
- Arrays are written as `Array<T>`, not `T[]` (enforced by lint).
- `max-lines` is 800 per file. If you are approaching it, split the file.

## After completing work

Run all four checks before handing work back:

```bash
bun install   # if deps changed
bun tsc
bun lint
bun run format
bun run test   # NOT `bun test` — that runs Bun's built-in runner and bypasses vitest
```

All four must pass cleanly. No warnings, no skipped checks.

> **Trap**: `bun test` (without `run`) invokes Bun's built-in test runner,
> which ignores `vitest.config.ts` and `tests/setup.ts`, so MSW never
> starts and every HTTP test silently fails. Always use `bun run test`.

## What lives where

```
src/
  index.ts          Public entrypoint. Everything public is re-exported here.
  client.ts         createBrewClient factory.
  types.ts          Public SDK types (client config, request options, etc.)
  core/
    auth.ts         Builds auth headers from API key.
    config.ts       Defaults + config resolution.
    errors.ts       BrewApiError and error mapping.
    headers.ts      Shared header helpers.
    http.ts         The transport layer: fetch + retries + error mapping.
    idempotency.ts  Idempotency key generation and handling.
    retry.ts        Retry policy.
    response.ts     Parsing + raw response mode.
    url.ts          URL + query param construction.
  resources/
    contacts.ts     brew.contacts.* methods.
    fields.ts       brew.fields.* methods.
  generated/
    openapi-types.ts  Generated from the public OpenAPI spec. Do not edit.

tests/
  msw/              MSW handlers + server (added later).
  *.test.ts         Vitest test files.
```

Files under `src/generated/` are produced from the OpenAPI spec in the app
repo. Never hand-edit them.

## Design doc

The full design rationale (DX bar, resource surface, retry matrix, testing
strategy, release flow) lives in `public-api-sdk-oss-plan.md` at the repo
root. Read that before making architectural changes.
