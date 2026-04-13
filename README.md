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

## Pointing at a different environment

`baseUrl` is configurable. By default it points at production
(`https://brew.new/api`), but you can override it for staging, local
development, or a custom proxy:

```ts
const brew = createBrewClient({
  apiKey: process.env.BREW_API_KEY!,
  baseUrl: process.env.BREW_API_URL ?? 'https://brew.new/api',
})
```

Common values:

- `https://brew.new/api` — production (default)
- `https://staging.brew.new/api` — staging
- `http://localhost:3000/api` — your own dev server

Trailing slashes are normalized either way. See
[`docs/configuration.md`](./docs/configuration.md) for the full list of
config options (`timeoutMs`, `maxRetries`, `userAgent`, custom `fetch`,
etc.).

## Documentation

| Topic                      | File                                                                   |
| -------------------------- | ---------------------------------------------------------------------- |
| Audiences resource         | [`docs/audiences.md`](./docs/audiences.md)                             |
| Brands resource            | [`docs/brands.md`](./docs/brands.md)                                   |
| Client configuration       | [`docs/configuration.md`](./docs/configuration.md)                     |
| Contacts resource          | [`docs/contacts.md`](./docs/contacts.md)                               |
| Domains resource           | [`docs/domains.md`](./docs/domains.md)                                 |
| Emails resource            | [`docs/emails.md`](./docs/emails.md)                                   |
| Fields resource            | [`docs/fields.md`](./docs/fields.md)                                   |
| Error handling             | [`docs/errors.md`](./docs/errors.md)                                   |
| Retries + idempotency      | [`docs/retries-and-idempotency.md`](./docs/retries-and-idempotency.md) |
| Sends resource             | [`docs/sends.md`](./docs/sends.md)                                     |
| Templates resource         | [`docs/templates.md`](./docs/templates.md)                             |
| Development + OpenAPI sync | [`docs/development.md`](./docs/development.md)                         |

## Development

Use a modern Node 20 or newer runtime for SDK development. On this
machine, Vitest worked with Node `20.19.2` and newer, but failed on the
older system Node `20.10.0`.

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
