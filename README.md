# @brew/api

Official TypeScript SDK for the Brew public API.

> Status: early scaffold. The public client is not implemented yet.

## Goals

- Excellent DX. Clearer than raw HTTP. Honest to the real API contract.
- Server-first. API keys are secrets.
- Typed responses, typed errors.
- Safe retries, automatic idempotency for POST.
- OpenAPI-backed wire types, hand-written ergonomic wrappers on top.
- No dependency on the Brew app repo at runtime.

## Install

```bash
bun add @brew/api
# or
npm install @brew/api
```

## Quick start

```ts
import { createBrewClient } from '@brew/api'

const brew = createBrewClient({
  apiKey: process.env.BREW_API_KEY!,
})

const contact = await brew.contacts.getByEmail({
  email: 'jane@example.com',
})
```

## Development

This package uses Bun and TypeScript.

```bash
bun install
bun tsc        # typecheck
bun lint       # lint
bun run format # prettier
bun test       # vitest
bun run build  # build to dist/ (esm + cjs + .d.ts)
```

All work is test-driven — see `AGENTS.md` for the full contribution
conventions.

## License

MIT
