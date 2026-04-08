# @brew.new/sdk

Official TypeScript SDK for the [Brew](https://brew.new) public API.

- Resource-oriented surface — `brew.contacts.upsert(...)` instead of raw HTTP plumbing.
- One typed error class (`BrewApiError`) for every non-2xx path.
- Safe retries with exponential backoff + jitter.
- Auto-generated `Idempotency-Key` on POST so retries never double-write.
- Node 20+, server-first. API keys are secrets — do not use this SDK directly in a browser.

## Install

```bash
bun add @brew.new/sdk
# or
npm install @brew.new/sdk
```

## Quick start

```ts
import { createBrewClient } from '@brew.new/sdk'

const brew = createBrewClient({
  apiKey: process.env.BREW_API_KEY!,
})

const contact = await brew.contacts.upsert({
  email: 'jane@example.com',
  firstName: 'Jane',
  customFields: { plan: 'enterprise' },
})

const found = await brew.contacts.getByEmail({ email: 'jane@example.com' })
```

That's the whole shape. Every other method follows the same pattern.

## Documentation

| Topic                 | File                                                                   |
| --------------------- | ---------------------------------------------------------------------- |
| Client configuration  | [`docs/configuration.md`](./docs/configuration.md)                     |
| Contacts resource     | [`docs/contacts.md`](./docs/contacts.md)                               |
| Fields resource       | [`docs/fields.md`](./docs/fields.md)                                   |
| Error handling        | [`docs/errors.md`](./docs/errors.md)                                   |
| Retries + idempotency | [`docs/retries-and-idempotency.md`](./docs/retries-and-idempotency.md) |
| OpenAPI type strategy | [`docs/openapi.md`](./docs/openapi.md)                                 |

## Development

```bash
bun install
bun tsc         # typecheck
bun lint        # eslint
bun run format  # prettier
bun run test    # vitest — NOT `bun test`, that hits Bun's built-in runner and bypasses MSW setup
bun run build   # tsup: dist/ with esm + cjs + .d.ts
```

Full contribution + testing conventions live in [`AGENTS.md`](./AGENTS.md).
The big one: every change is driven red → green via vitest + MSW, no
exceptions for "trivial" pure functions.

## License

MIT
