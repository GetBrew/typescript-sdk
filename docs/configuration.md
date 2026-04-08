# Configuration

Every `@brew.new/sdk` client is built with `createBrewClient(config)`. Only
`apiKey` is required; everything else has a sensible default and can be
overridden per-client.

## Full shape

```ts
import { createBrewClient } from '@brew.new/sdk'

const brew = createBrewClient({
  apiKey: process.env.BREW_API_KEY!,

  // optional — defaults shown
  baseUrl: 'https://brew.new/api',
  timeoutMs: 30_000,
  maxRetries: 2,
  userAgent: 'brew.new-sdk/0.1.0-alpha.0',
  fetch: globalThis.fetch,
})
```

## Fields

### `apiKey` (required)

Your Brew API key. Sent on every request as
`Authorization: Bearer <apiKey>`.

The SDK validates this at the boundary — passing an empty or
whitespace-only string throws a `TypeError` immediately rather than
letting the request go out and come back as a confusing 401.

API keys are server-side secrets. **Never bundle this SDK into a browser
build with a real key.**

### `baseUrl`

Default: `https://brew.new/api`.

Override for staging or self-hosted environments. The SDK strips a
trailing slash automatically — `https://brew.new/api/` and
`https://brew.new/api` resolve identically.

### `timeoutMs`

Default: `30_000` (30 seconds).

Per-attempt timeout. The SDK aborts the underlying fetch via
`AbortController` if the response has not arrived within this many
milliseconds. Retries get a fresh timeout each, so the worst-case
wall-clock for a request is roughly `(maxRetries + 1) * timeoutMs` plus
backoff.

You can override this per-request via `RequestOptions.timeoutMs`.

### `maxRetries`

Default: `2`.

Number of retries on top of the initial attempt. With the default of 2,
a single request will make at most 3 HTTP attempts before giving up.

Setting this to `0` disables retries entirely. Setting it higher than
`5` is generally pointless — by then the upstream is genuinely down and
you should escalate to the caller.

You can override per-request via `RequestOptions.maxRetries`.

### `userAgent`

Default: `brew.new-sdk/<version>`.

Sent as the `User-Agent` header on every request. Override if you want
your application to be attributable in Brew's server logs:

```ts
const brew = createBrewClient({
  apiKey: process.env.BREW_API_KEY!,
  userAgent: `acme-billing/${process.env.APP_VERSION!} (brew.new-sdk)`,
})
```

### `fetch`

Default: `globalThis.fetch`, late-bound at call time.

Inject a custom fetch implementation when you need to:

- Route requests through an internal proxy.
- Add tracing headers from a host application.
- Use a polyfilled fetch on a runtime older than Node 20.
- Run the SDK in a constrained environment with a non-standard
  transport.

```ts
const tracedFetch: typeof globalThis.fetch = async (input, init) => {
  const start = Date.now()
  const response = await globalThis.fetch(input, init)
  myMetrics.recordHttp({ ms: Date.now() - start, status: response.status })
  return response
}

const brew = createBrewClient({
  apiKey: process.env.BREW_API_KEY!,
  fetch: tracedFetch,
})
```

The custom fetch must satisfy `typeof globalThis.fetch` — i.e., the
standard Fetch API signature.

## Per-request overrides

Every resource method that mutates data (`upsert`, `upsertMany`,
`patch`, `delete`, `deleteMany`, `fields.create`, `fields.delete`)
accepts a second `RequestOptions` argument:

```ts
type RequestOptions = {
  readonly signal?: AbortSignal
  readonly timeoutMs?: number
  readonly maxRetries?: number
  readonly idempotencyKey?: string
  readonly raw?: boolean
}
```

Example — overriding the retry budget for one critical write:

```ts
await brew.contacts.upsert(
  { email: 'jane@example.com', firstName: 'Jane' },
  { maxRetries: 5, timeoutMs: 60_000 }
)
```

Example — propagating an upstream abort signal:

```ts
const controller = new AbortController()
setTimeout(() => controller.abort(), 5_000)

await brew.contacts.list({ limit: 100 }, { signal: controller.signal })
```

See [`docs/retries-and-idempotency.md`](./retries-and-idempotency.md)
for the `idempotencyKey` and `raw` fields in detail.
