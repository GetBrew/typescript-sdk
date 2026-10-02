# Configuration

Every `@brew.new/sdk` client is built with `createBrewClient(config)`. Only
`apiKey` is required; everything else has a sensible default and can be
overridden per-client.

## Full shape

```ts
import { createBrewClient } from '@brew.new/sdk'

const brew = createBrewClient({
  apiKey: process.env.BREW_API_KEY!,

  // optional — organization-scoped keys only; see below
  brandId: 'kx7b3s7fapqz8mjm12ekz1kxdx87yceg',

  // optional — defaults shown
  baseUrl: 'https://brew.new/api',
  timeoutMs: 30_000,
  maxRetries: 2,
  retryOnTimeout: true,
  signal: undefined,
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

### `brandId` (optional)

The brand that brand-scoped resources act on, sent as `X-Brand-Id`.

Only meaningful for an **organization-scoped** key. A brand-scoped key resolves
its own brand and rejects a different one with `403 BRAND_SCOPE_MISMATCH`; an
organization-scoped key that names none gets `400 BRAND_ID_REQUIRED`, because
there is deliberately no default brand.

Organization-level resources such as `brands`, `templates`, and `usage` never
send `X-Brand-Id`, even from a pinned client.

Validated at the boundary like `apiKey`: an empty or whitespace-only string
throws a `TypeError` rather than silently omitting the header and failing
server-side.

Prefer [`client.withBrand(id)`](./brands.md) when you work across several
brands — it returns a pinned client instead of rebuilding one:

```ts
const acme = brew.withBrand(brandId)
await acme.emails.list()
```

API keys are server-side secrets. **Never bundle this SDK into a browser
build with a real key.**

### `baseUrl`

Default: `https://brew.new/api`.

Override for staging or self-hosted environments. The SDK strips a
trailing slash automatically — `https://brew.new/api/` and
`https://brew.new/api` resolve identically.

### `timeoutMs`

Default: `30_000` (30 seconds).

Per-attempt deadline covering the **whole** attempt: connecting, waiting
for the response headers, and reading the response body. A server that
answers quickly and then stalls partway through its body fails at
`timeoutMs` with a `BrewTimeoutError`; it does not hang. Retries get a
fresh deadline each (see [`retryOnTimeout`](#retryontimeout)), so the
worst-case wall-clock for a request is roughly
`(maxRetries + 1) * timeoutMs` plus backoff.

You can override this per-request via `RequestOptions.timeoutMs`.

Must be a number of milliseconds `>= 0`; `Infinity` means no deadline.
`NaN` or a negative value throws a `TypeError` rather than silently
waiting forever.

Methods whose server work routinely outlasts 30 seconds set their own
per-call default. It is a **floor**, never a cap: a per-request
`timeoutMs` always wins; otherwise the call gets the longer of the
method default and the client's `timeoutMs`. Each constant is exported
for callers composing their own deadlines:

| Method                  | Default | Constant                                   |
| ----------------------- | ------- | ------------------------------------------ |
| `emails.generate`       | 240 s   | `GENERATE_EMAIL_DEFAULT_TIMEOUT_MS`        |
| `emails.edit`           | 240 s   | `EDIT_EMAIL_DEFAULT_TIMEOUT_MS`            |
| `emails.import`         | 300 s   | `IMPORT_EMAIL_DEFAULT_TIMEOUT_MS`          |
| `emails.importFigma`    | 800 s\* | `IMPORT_FIGMA_DEFAULT_TIMEOUT_MS`          |
| `emails.previewClients` | 90 s    | `PREVIEW_EMAIL_CLIENTS_DEFAULT_TIMEOUT_MS` |
| `emails.audit`          | 40 s    | `AUDIT_EMAIL_DEFAULT_TIMEOUT_MS`           |
| `content.gif`           | 300 s   | `GIF_DEFAULT_TIMEOUT_MS`                   |
| `content.generateImage` | 180 s   | `GENERATE_IMAGE_DEFAULT_TIMEOUT_MS`        |
| `content.addImage`      | 300 s   | `ADD_IMAGE_DEFAULT_TIMEOUT_MS`             |
| `content.uploadImage`†  | 120 s   | `IMAGE_UPLOAD_BYTES_DEFAULT_TIMEOUT_MS`    |

† The step that POSTs the file's bytes to `uploadUrl`; the `addImage` step
gets `addImage`'s own default.

\* **Node's built-in `fetch` has its own 300-second ceiling.** It stops
waiting after 300 s for the response headers, or after 300 s without a
byte of the body, whatever `timeoutMs` says. The SDK reports that as a
`BrewTimeoutError` too (the runtime's error is on `cause`), so on Node
any `timeoutMs` above 300 s behaves as 300 s. To wait longer, raise the
runtime's limits — for example with the `undici` package (`npm install
undici`; the SDK itself has no dependencies), whose global dispatcher
Node's `fetch` uses:

```ts
import { Agent, setGlobalDispatcher } from 'undici'

setGlobalDispatcher(
  new Agent({ headersTimeout: 900_000, bodyTimeout: 900_000 })
)
```

### `retryOnTimeout`

Default: `true`.

Whether an attempt that hit `timeoutMs` is retried like any other
transient failure (subject to the method policy in
[retries-and-idempotency.md](./retries-and-idempotency.md)). Set it to
`false` for a hard deadline: one attempt, then `BrewTimeoutError`.
Override per request via `RequestOptions.retryOnTimeout`.

A POST retried after a timeout carries the same idempotency key. If the
first attempt is still running on the server, the retry is refused and
the SDK throws the timeout with `inProgress: true` rather than waiting
another full `timeoutMs` — see
[Recovering after an unknown outcome](./retries-and-idempotency.md#recovering-after-an-unknown-outcome).

### `signal`

Default: none.

An `AbortSignal` that cancels **every** request made through this client
(and its `withBrand()` clients) — for shutting a process down cleanly.
It combines with each request's own `RequestOptions.signal`: either one
aborting stops the request wherever it is (connecting, reading the body,
backing off), and it rejects with that signal's `reason`. Never retried.

```ts
const shutdown = new AbortController()
process.once('SIGTERM', () => shutdown.abort())

const brew = createBrewClient({
  apiKey: process.env.BREW_API_KEY!,
  signal: shutdown.signal,
})
```

Cancelling does not stop work the server already started. Replay an
interrupted write with the same idempotency key — pass your own
`idempotencyKey` on writes you might cancel, since a cancel rejects with
your `reason` and carries no key of the SDK's.

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
standard Fetch API signature — and should pass `init.signal` through.
The SDK aborts that signal to enforce `timeoutMs`, to cancel, and to
close a discarded retry's connection. The SDK bounds the response body
read itself either way, but a fetch that drops the signal keeps its
connections open until it closes them on its own.

## Per-request overrides

Every resource method accepts a `RequestOptions` object as its last
argument:

```ts
type RequestOptions = {
  readonly signal?: AbortSignal
  readonly timeoutMs?: number
  readonly maxRetries?: number
  readonly retryOnTimeout?: boolean
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

await brew.contacts.search({ limit: 100 }, { signal: controller.signal })
```

The request rejects with `controller.signal.reason` — here a
`DOMException` named `'AbortError'`; with `abort(myReason)`, `myReason`
itself — whether it was connecting, reading the body, or backing off
between retries.

See [`docs/retries-and-idempotency.md`](./retries-and-idempotency.md)
for the `idempotencyKey` and `raw` fields in detail.
