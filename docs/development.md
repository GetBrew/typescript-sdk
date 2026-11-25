# Development

The Brew API contracts are owned by the `brew-v2` repository. This SDK consumes
the vendored OpenAPI document and exposes typed resource methods. Read
[AGENTS.md](../AGENTS.md) for implementation conventions and
[RELEASING.md](../RELEASING.md) for versioning and publication.

## Contract generation

Keep `brew-v2`, `docs`, `typescript-sdk` and `brew-cli` as sibling checkouts.
The app's `scripts/openapi-targets.ts` owns the mirror destinations and supports
`BREW_SIBLINGS_ROOT` when they are elsewhere. Generation updates the app spec
and each available sibling; coordinated contract work requires all consumers.

From `brew-v2`:

```bash
pnpm openapi:generate
pnpm openapi:sync:sdk-types
pnpm openapi:check
```

From this repository, regenerate SDK types with:

```bash
bun run generate:types
```

Never hand-edit `openapi/public-api-v1.yaml` or `src/generated/openapi-types.ts`.
Commit generated changes with their source contract. For embed contract
changes in the app, run `bun run sync:embed` here and verify with
`bun run sync:embed:check`.

## Add or change a resource method

1. Update the API contract and its behavior tests in `brew-v2`.
2. Generate the spec mirrors and SDK types.
3. Add a thin method under `src/resources/<resource>/` and compose it in the
   resource's `resource.ts`. Derive wire types from `src/generated/`.
4. Export public types through `src/index.ts`; add a resource to `src/client.ts`
   only when extending the client surface.
5. Add a failing Vitest/MSW test, implement the behavior, then confirm it passes.
   Use the shared transport rather than duplicating retries or error handling.
6. Update the relevant resource guide. Keep examples consistent with the actual
   public signature and avoid copied type definitions when an exported type exists.

## Validation

Use the commands in `package.json`; CI owns the complete gate set. For code
changes, run lint and the relevant tests. Run the typecheck when types,
contracts, dependencies or generated output change. Markdown changes need
formatting and link/example checks.

```bash
bun run tsc
bun run lint
bun run format:check
bun run test -- tests/resources/flows/get.test.ts
```

Use `bun run test`, because `bun test` bypasses Vitest's MSW setup. Tests use
mocked HTTP or deliberate loopback servers, never the live Brew API.

## Git source dependencies

Git installs require Bun. The `prepare` script installs locked build dependencies
without lifecycle scripts, builds all distribution entries in a temporary
workspace, then copies the distribution back. This avoids declaration emission
from source inside `node_modules`. Preparation logs go to stderr so
`npm pack --json` remains machine-readable.

Consumers may pin an immutable source commit during coordinated work. Before
release, publish the SDK, switch consumers to that registry version and regenerate
their lockfiles from the actual artifact. Never invent checksums or substitute a
locally packed SDK for a fresh-install check.
