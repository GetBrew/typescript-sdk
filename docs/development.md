# Development

`@brew.new/sdk` is a standalone consumer of the Brew public API. The server's
Zod schemas own the API contract; the SDK derives its types from a pinned,
vendored OpenAPI document. Read [AGENTS.md](../AGENTS.md) for code conventions
and [RELEASING.md](../RELEASING.md) before changing a version or publishing.

## Local setup

Use Bun and a modern Node runtime (Node 20.19 or newer for development tools).
The server API client supports Node 20 and newer.

```bash
git clone https://github.com/GetBrew/typescript-sdk.git
cd typescript-sdk
bun install
```

SDK-only changes need no server checkout. The vendored spec and generated types
are committed, so tests and type generation work from this repository alone.

## Importing an API contract

The `brew-v2` repository owns the schemas and produces a versioned contract
artifact. A producer checkout can create an artifact with:

```bash
pnpm contract:build --output /tmp/brew-contracts
```

The command prints its artifact directory and digest. Transfer that directory
from the producer or download the artifact attached to its automated contract
update. In the SDK checkout, import the exact reviewed digest:

```bash
bun run contract:import -- --artifact /tmp/brew-contracts/<digest> --digest <digest>
bun run contract:check
```

The importer verifies the artifact, pins its identity, updates the vendored
OpenAPI file and regenerates TypeScript types. Review and commit those changes
together. `contract:check` verifies the local pin's integrity; it does not claim
that this SDK already matches the newest server deployment. Automated update
PRs make newer source artifacts available for review.

The dependency direction is one way:

```text
brew-v2 Zod schemas
  → immutable contract artifact and digest
  → SDK contract import and pin
  → openapi/public-api-v1.yaml
  → src/generated/openapi-types.ts
  → src/resources/*
```

Never hand-edit `openapi/public-api-v1.yaml` or `src/generated/`. To regenerate
TypeScript from the already vendored spec without changing the pin:

```bash
bun run generate:types
```

## Adding or changing a method

1. Make the API change and its integration tests in `brew-v2`, then import the
   reviewed contract artifact here.
2. Write the SDK regression test first. Run it and confirm it fails before
   implementing the change.
3. Add the method under `src/resources/<resource>/`. Derive public request and
   response types from `src/generated/openapi-types.ts`.
4. Wire the method into that resource's `resource.ts` and re-export public types
   from `src/index.ts`. A new resource also needs client composition in
   `src/client.ts`.
5. Document the method in `docs/<resource>.md`, with an example and any relevant
   retry, idempotency or error behavior.
6. Run the focused tests, lint and any relevant typecheck. Follow
   [RELEASING.md](../RELEASING.md) for release changes.

Keep resource methods thin: shared transport, retries, deadlines, error mapping
and pagination belong in `src/core/`. A new endpoint normally needs no transport
change. Use `makeTestHttpClient` from `tests/helpers/http-client.ts` for MSW
resource tests; never call the real Brew API in tests.

Public overloads distinguish `raw: true` from `RequestOptions<false>` and
reusable `RequestOptions`: omitted or literal `false` returns the payload, literal
`true` returns `BrewRawResponse<T>`, and reusable boolean options return the
`BrewResponse<T>` union. Preserve that distinction when adding a method. Methods that also
specialize by input, such as template counts or batch image imports, retain
input-specific returns.

## Fast iteration and validation

```bash
bun run test -- tests/core/url.test.ts  # exact source test; no distribution build
bun run test:unit                      # source, MSW and browser source tests
bun run test:watch                     # watches the unit project
bun run tsc                           # strict TypeScript checks
bun run lint                          # ESLint
bun run format:check                  # read-only formatting check
```

Vitest's `unit` project uses hermetic MSW and deliberate loopback servers.
Packaging checks have a separate project that builds fresh distribution files
and checks the package archive before its tests:

```bash
bun run test:packaging
bun run test                          # both projects, as in CI
bun run build                         # explicit ESM, CJS and declaration build
```

An exact packaging test can still run through `bun run test -- <file>`; only its
owning project performs distribution setup. A source-only invocation does not
require the package to bundle successfully.

Use `bun run format` only when intentionally writing formatting changes. Run
checks appropriate to the change locally; CI runs the full gate set. Report
checks run and any deferred verification.

## Build and source installations

`bun run build` emits ESM/CJS JavaScript, source maps, and `.d.ts`/`.d.cts`
declarations for the server, embed and React entry points. The npm tarball ships
only `dist/`, `README.md` and `LICENSE`.

Git source installs require Bun. `prepare` installs locked build dependencies
without lifecycle scripts and builds the distribution in a temporary workspace.
TypeScript does not emit declarations for source files inside `node_modules`,
where Git dependencies may be prepared. The temporary build avoids this limit
and copies back only distribution files. Preparation logs use stderr so
`npm pack --json` remains machine-readable.

A coordinated consumer can pin an immutable SDK Git commit while a registry
release is pending. Switch to the published version and regenerate its lockfile
before release.

## Common pitfalls

- Use `bun run test`, never `bun test`: Bun's built-in runner skips Vitest's MSW
  setup and projects.
- API timestamps such as `createdAt` are UNIX milliseconds, not date strings.
- Custom field vocabulary uses `'bool'`, not `'boolean'`, and has no `'array'`
  field type.
- `SDK_VERSION` is injected from `package.json` during the build. Do not edit a
  second version constant.
- PATCH is not retried automatically, even with an idempotency key. Re-read
  current state before issuing a new partial update.
- Never commit API keys or call production writes as validation.
