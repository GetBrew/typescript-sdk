# MSW v2 Reference Notes — `@brew/api` SDK Testing

Working notes for mocking the Brew public API with **Mock Service Worker v2+** under **vitest** in **Node.js** (`msw/node`). The SDK is Node-only and uses global `fetch`, so nothing here touches the browser Service Worker flow.

All examples are TypeScript. Where v1 and v2 differ, that is called out explicitly — we are on v2.

---

## 1. Installation + Node.js setup

Docs: [Getting Started](https://mswjs.io/docs/getting-started) · [Integrations / Node](https://mswjs.io/docs/integrations/node) · [setupServer](https://mswjs.io/docs/api/setup-server) · [server.listen](https://mswjs.io/docs/api/setup-server/listen) · [server.close](https://mswjs.io/docs/api/setup-server/close)

### Install

```bash
npm i -D msw
# or
bun add -d msw
```

Requires **Node.js >= 18** and **TypeScript >= 4.7**.

### Works with global `fetch`

MSW v2 in Node patches the underlying HTTP modules directly (native class extensions on `http`/`https`/`undici`). This means it intercepts `globalThis.fetch` in Node 18+ out of the box, as well as `node-fetch`, `axios`, `undici`, etc. The SDK's default transport (`globalThis.fetch`) will be intercepted automatically — no transport swap needed for tests.

Quirk worth knowing: because interception is done via native class extension, `server.listen()` and `server.close()` are synchronous in Node (unlike `worker.start()` in the browser which is async).

### Minimal Node setup (three files)

```ts
// tests/msw/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('https://brew.new/api/v1/contacts/:email', () => {
    return HttpResponse.json({ id: 'abc-123', email: 'john@example.com' })
  }),
]
```

```ts
// tests/msw/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

```ts
// tests/setup.ts  (wired via vitest.config.ts → test.setupFiles)
import { beforeAll, afterEach, afterAll } from 'vitest'
import { server } from './msw/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.ts'],
  },
})
```

### `onUnhandledRequest` option

Passed to `server.listen({ onUnhandledRequest })`. Controls what happens when a request has no matching handler.

| Value      | Behavior                                                            |
| ---------- | ------------------------------------------------------------------- |
| `"warn"`   | Print a warning, let the request hit the real network (default).    |
| `"error"`  | Print an error and halt the request. **Recommended for SDK tests.** |
| `"bypass"` | Silent passthrough to the real network.                             |
| `function` | Custom callback — decide per request.                               |

For SDK tests, **always use `'error'`**. The SDK test suite must never accidentally hit `https://brew.new` for real — an unhandled request is a bug in the test, and you want a loud failure, not a silent passthrough that might 401 against production.

Custom callback shape (useful if you want to ignore certain paths, e.g. localhost debug endpoints):

```ts
server.listen({
  onUnhandledRequest(request, print) {
    const url = new URL(request.url)
    if (url.hostname === 'localhost') return
    print.error()
  },
})
```

### Lifecycle methods (summary)

- `server.listen(options?)` — start interception. Synchronous. Call once in `beforeAll`.
- `server.use(...handlers)` — add runtime handlers (prepended, highest priority).
- `server.resetHandlers()` — remove runtime handlers added via `use()`. Keeps initial handlers. Call in `afterEach`.
- `server.resetHandlers(...newHandlers)` — **replace** both initial and runtime handlers entirely. Rarely wanted.
- `server.restoreHandlers()` — reactivate `{ once: true }` handlers that were already consumed.
- `server.listHandlers()` — returns the current handler list. Useful for debugging.
- `server.close()` — stop interception, restore native modules. Synchronous. Call in `afterAll`.

---

## 2. Handler API — `http` namespace

Docs: [http](https://mswjs.io/docs/api/http) · [Request matching](https://mswjs.io/docs/basics/request-matching)

### v1 vs v2

v1 used `rest.get(path, (req, res, ctx) => res(ctx.json(...)))`. **v2 replaced `rest` with `http`** and a single-argument resolver:

```ts
// v1 (do not use)
rest.get('/contacts/:email', (req, res, ctx) => res(ctx.json({ id: 1 })))

// v2
http.get('/contacts/:email', ({ request, params }) => {
  return HttpResponse.json({ id: 1 })
})
```

### Methods

All match the Fetch API verbs:

```ts
http.get(path, resolver, options?)
http.post(path, resolver, options?)
http.put(path, resolver, options?)
http.patch(path, resolver, options?)
http.delete(path, resolver, options?)
http.head(path, resolver, options?)
http.options(path, resolver, options?)
http.all(path, resolver, options?)     // matches any method
```

`http.all` is handy for catch-all stubs ("any request to this path → 500") when you don't care about the method.

### Path matching

Because the SDK talks to a single origin (`https://brew.new/api/v1/...`), **always use absolute URLs in handlers**. This prevents accidental matches against a relative URL the SDK accidentally constructed.

```ts
// Absolute URL — preferred for the Brew SDK
http.get('https://brew.new/api/v1/contacts/:email', resolver)

// Path params (colon syntax)
http.get('https://brew.new/api/v1/contacts/:email', ({ params }) => {
  params.email // string
})

// Multiple params
http.patch(
  'https://brew.new/api/v1/lists/:listId/contacts/:contactId',
  ({ params }) => {
    const { listId, contactId } = params
  }
)

// Wildcard — matches anything under this path
http.get('https://brew.new/api/v1/*', resolver)

// Regex
http.get(/\/api\/v1\/contacts\/[^/]+$/, resolver)
```

Base URL handling: MSW matches **scheme + host + pathname**. Query strings are not part of the match — query params are read inside the resolver via `new URL(request.url).searchParams`.

### Resolver argument shape

```ts
http.get(
  'https://brew.new/api/v1/contacts/:email',
  ({
    request, // Fetch API Request instance
    params, // { email: string } — typed via generics (see below)
    cookies, // parsed request cookies as a record
    requestId, // string — MSW's unique request id (not our x-request-id header)
  }) => {
    /* ... */
  }
)
```

- `request` is a standard Fetch `Request`. Read headers via `request.headers.get('idempotency-key')`, URL via `new URL(request.url)`, body via `await request.json()` etc.
- `requestId` is MSW's internal id — unrelated to the Brew API's `x-request-id` response header.

### Type-safe resolvers (generics)

Four generics on each method:

```ts
http.post<Params, RequestBody, ResponseBody, Path>(path, resolver, options?)
```

```ts
type CreateContactParams = {} // POST /v1/contacts has no path params
type CreateContactRequest = { email: string; firstName?: string }
type CreateContactResponse = { id: string; email: string; createdAt: string }

http.post<CreateContactParams, CreateContactRequest, CreateContactResponse>(
  'https://brew.new/api/v1/contacts',
  async ({ request }) => {
    const body = await request.json() // typed as CreateContactRequest
    return HttpResponse.json({
      // must match CreateContactResponse
      id: 'abc-123',
      email: body.email,
      createdAt: new Date().toISOString(),
    })
  }
)
```

Share these types with the SDK (import from a common `types.ts`) so a breaking API change fails **both** runtime tests and the typechecker.

### Handler options

```ts
http.get(
  'https://brew.new/api/v1/contacts/:email',
  () => HttpResponse.json({ id: 1 }),
  { once: true } // handler is consumed after first match
)
```

`{ once: true }` is the main v2 option. Use it for sequenced responses (see §4). `server.restoreHandlers()` un-consumes them.

---

## 3. `HttpResponse` — building responses

Docs: [HttpResponse](https://mswjs.io/docs/api/http-response)

`HttpResponse` extends the Fetch `Response` class with MSW-specific features (cookies, etc.). In v2 it **replaces v1's `res()` + `ctx` composition**.

### Static constructors

```ts
// JSON (sets Content-Type automatically)
HttpResponse.json({ id: 'abc-123' })
HttpResponse.json({ error: 'not_found' }, { status: 404 })

// Plain text
HttpResponse.text('Hello world')

// HTML / XML
HttpResponse.html('<p>hi</p>')
HttpResponse.xml('<post><id>1</id></post>')

// Binary
HttpResponse.arrayBuffer(buffer, {
  headers: { 'Content-Type': 'application/octet-stream' },
})

// FormData
const fd = new FormData()
fd.append('id', 'abc-123')
HttpResponse.formData(fd)
```

### Raw constructor (custom bodies, no-body responses)

```ts
// 204 No Content
new HttpResponse(null, { status: 204 })

// 404 text body
new HttpResponse('Not found', {
  status: 404,
  statusText: 'Not Found',
  headers: { 'Content-Type': 'text/plain' },
})
```

### Custom headers (the ones the SDK cares about)

The SDK extracts `x-request-id`, `retry-after`, and rate-limit headers into `BrewApiError` and the `raw: true` response. Mock them via the `headers` init option:

```ts
HttpResponse.json(
  {
    error: { type: 'rate_limited', code: 'too_many_requests', message: '...' },
  },
  {
    status: 429,
    headers: {
      'x-request-id': 'req_abc123',
      'retry-after': '2',
      'x-ratelimit-limit': '100',
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': '1712649600',
    },
  }
)
```

### Network-level failure — `HttpResponse.error()`

Returns a Fetch `Response.error()` — the kind of response that makes `fetch()` throw a `TypeError: fetch failed`. Use this to test the SDK's network-error retry branch.

```ts
http.post('https://brew.new/api/v1/contacts', () => {
  return HttpResponse.error()
})
```

**Limitation:** you cannot customize the error message or code per the Fetch spec. If the SDK differentiates error causes by message string, that's a smell — branch on `instanceof TypeError` or on whether a `Response` was received at all.

---

## 4. Dynamic / stateful handlers

Docs: [Network behavior overrides](https://mswjs.io/docs/best-practices/network-behavior-overrides) · [http options](https://mswjs.io/docs/api/http)

### Branching on the request

```ts
http.post('https://brew.new/api/v1/contacts', async ({ request }) => {
  const body = (await request.json()) as { email: string }

  if (!body.email.includes('@')) {
    return HttpResponse.json(
      {
        error: {
          type: 'validation',
          code: 'invalid_email',
          message: 'bad email',
        },
      },
      { status: 422 }
    )
  }

  return HttpResponse.json(
    { id: 'abc-123', email: body.email },
    { status: 201 }
  )
})
```

### Branching on headers / query / path params

```ts
http.get('https://brew.new/api/v1/contacts', ({ request }) => {
  const url = new URL(request.url)
  const limit = Number(url.searchParams.get('limit') ?? 20)
  const auth = request.headers.get('authorization')

  if (!auth?.startsWith('Bearer ')) {
    return HttpResponse.json(
      { error: { type: 'auth', code: 'unauthorized', message: 'no token' } },
      { status: 401 }
    )
  }

  return HttpResponse.json({ items: [], limit })
})
```

### Sequenced responses via `{ once: true }`

The cleanest way to test retry behavior: stack multiple one-shot handlers. MSW prepends them, so the **last registered is the first to match**.

```ts
// To test "fail twice, succeed on third", register in REVERSE order:
// - last .use() wins first, so start with the 503s, then add the 200 last.
server.use(
  http.post(
    'https://brew.new/api/v1/contacts',
    () => {
      return HttpResponse.json(
        { error: { type: 'server', code: '503' } },
        { status: 503 }
      )
    },
    { once: true }
  ),
  http.post(
    'https://brew.new/api/v1/contacts',
    () => {
      return HttpResponse.json(
        { error: { type: 'server', code: '503' } },
        { status: 503 }
      )
    },
    { once: true }
  ),
  http.post('https://brew.new/api/v1/contacts', () => {
    return HttpResponse.json({ id: 'abc-123' }, { status: 201 })
  })
)
```

Note: `server.use(a, b, c)` prepends in order — after the call, `c` is the newest (matches last added first). In practice when all handlers have the same path+method, MSW consumes the `{ once: true }` ones in the order registered to `use()`. See the concrete retry test in §12 which uses this pattern reliably.

### Stateful counter via closure

Simpler for count-based assertions:

```ts
function makeCountingHandler() {
  let calls = 0
  const handler = http.post('https://brew.new/api/v1/contacts', () => {
    calls++
    if (calls < 3) {
      return new HttpResponse(null, {
        status: 503,
        headers: { 'retry-after': '0' },
      })
    }
    return HttpResponse.json({ id: 'abc-123' }, { status: 201 })
  })
  return { handler, getCalls: () => calls }
}

const { handler, getCalls } = makeCountingHandler()
server.use(handler)
// ... run SDK call ...
expect(getCalls()).toBe(3)
```

Reset this state per test — never lift the counter to module scope without resetting in `afterEach`.

---

## 5. Per-test overrides — `server.use(...)`

Docs: [Network behavior overrides](https://mswjs.io/docs/best-practices/network-behavior-overrides) · [server.use](https://mswjs.io/docs/api/setup-server/use) · [server.resetHandlers](https://mswjs.io/docs/api/setup-server/reset-handlers)

### Semantics

- `server.use(...handlers)` **prepends** handlers to the current list. Prepended = higher priority. A per-test override of `GET /contacts/:email` will win over the initial handler for that same route.
- Runtime handlers persist until `server.resetHandlers()` is called (or the process exits).
- `server.resetHandlers()` with **no arguments** removes runtime handlers, keeps initial ones. **This is what you want in `afterEach`.**
- `server.resetHandlers(...newHandlers)` **replaces both** initial and runtime handlers. Avoid unless you're intentionally re-partitioning the whole fixture.

### Recommended pattern

Broad sensible defaults in `handlers.ts`, sharp per-test overrides via `server.use`:

```ts
// tests/msw/handlers.ts — defaults, succeed + return realistic shapes
export const handlers = [
  http.get('https://brew.new/api/v1/contacts/:email', ({ params }) => {
    return HttpResponse.json({ id: 'default', email: params.email })
  }),
  http.post('https://brew.new/api/v1/contacts', async ({ request }) => {
    const body = (await request.json()) as { email: string }
    return HttpResponse.json(
      { id: 'default', email: body.email },
      { status: 201 }
    )
  }),
]

// tests/contacts.test.ts — override for a single test
it('maps 404 to BrewApiError', async () => {
  server.use(
    http.get('https://brew.new/api/v1/contacts/:email', () => {
      return HttpResponse.json(
        {
          error: {
            type: 'not_found',
            code: 'contact_not_found',
            message: 'nope',
          },
        },
        { status: 404, headers: { 'x-request-id': 'req_test' } }
      )
    })
  )
  await expect(
    client.contacts.get('missing@example.com')
  ).rejects.toMatchObject({
    status: 404,
    code: 'contact_not_found',
    requestId: 'req_test',
  })
})
```

---

## 6. Network failure + timeout simulation

Docs: [delay](https://mswjs.io/docs/api/delay) · [HttpResponse](https://mswjs.io/docs/api/http-response)

### Network error

```ts
server.use(
  http.post('https://brew.new/api/v1/contacts', () => HttpResponse.error())
)

// In the SDK, fetch will throw TypeError. Your retry logic should catch
// and retry per its network-error policy.
```

### `delay()` utility

```ts
import { delay, http, HttpResponse } from 'msw'

// Fixed milliseconds
http.get('https://brew.new/api/v1/contacts/:email', async () => {
  await delay(500)
  return HttpResponse.json({ id: 'slow' })
})

// Infinite (never resolves — perfect for abort/timeout tests)
http.get('https://brew.new/api/v1/contacts/:email', async () => {
  await delay('infinite')
  return HttpResponse.json({ id: 'never' })
})

// 'real' — realistic 100-400ms jitter (no-op in Node tests)
await delay('real')

// No arg — same as 'real', but negated in Node test environments
await delay()
```

In Node test runs, `delay()` without an argument is a no-op so tests don't artificially slow down. Only explicit ms values and `'infinite'` actually wait.

### Testing the SDK's AbortController / timeout behavior

The SDK wraps `fetch(url, { signal })` with an abort-on-timeout. To test it:

```ts
it('aborts after timeoutMs', async () => {
  server.use(
    http.get('https://brew.new/api/v1/contacts/:email', async () => {
      await delay('infinite')
      return HttpResponse.json({ id: 'x' })
    })
  )

  const client = new BrewClient({ apiKey: 'test', timeoutMs: 100 })
  await expect(client.contacts.get('a@b.com')).rejects.toThrow(/abort/i)
})
```

When the SDK's AbortController fires, the pending `fetch()` rejects with a `DOMException: The operation was aborted` (or `AbortError`). MSW's `delay('infinite')` does not interfere — the abort propagates through MSW's intercepted fetch normally.

---

## 7. Assertions on requests

Docs: [Life-cycle events](https://mswjs.io/docs/api/life-cycle-events) · [server.listHandlers](https://mswjs.io/docs/api/setup-server/list-handlers)

### Lifecycle events

Available via `server.events.on(eventName, listener)`:

| Event                | Fires when                                  | Payload                            |
| -------------------- | ------------------------------------------- | ---------------------------------- |
| `request:start`      | A request is about to be handled            | `{ request, requestId }`           |
| `request:match`      | A request matched a handler                 | `{ request, requestId }`           |
| `request:unhandled`  | A request matched no handler                | `{ request, requestId }`           |
| `request:end`        | Request handling completed (matched or not) | `{ request, requestId }`           |
| `response:mocked`    | A mocked response was returned              | `{ request, requestId, response }` |
| `response:bypass`    | Request bypassed MSW (passthrough)          | `{ request, requestId, response }` |
| `unhandledException` | Resolver threw                              | `{ request, requestId, error }`    |

### Spy-style request assertions (the pattern to use)

Collect requests into an array in `beforeEach`, inspect in the test, clear in `afterEach`.

```ts
import { beforeEach, afterEach, it, expect } from 'vitest'
import { server } from './msw/server'

let requests: Array<{
  method: string
  url: string
  headers: Headers
  body: string
}>

beforeEach(() => {
  requests = []
  server.events.on('request:start', async ({ request }) => {
    // CRITICAL: clone before reading — body can only be consumed once.
    const clone = request.clone()
    const body = await clone.text()
    requests.push({
      method: request.method,
      url: request.url,
      headers: request.headers,
      body,
    })
  })
})

afterEach(() => {
  server.events.removeAllListeners()
})

it('sends Idempotency-Key on POST', async () => {
  await client.contacts.create({ email: 'a@b.com' })

  expect(requests).toHaveLength(1)
  const [req] = requests
  expect(req.method).toBe('POST')
  expect(req.headers.get('idempotency-key')).toMatch(/^[0-9a-f-]{36}$/)
  expect(JSON.parse(req.body)).toEqual({ email: 'a@b.com' })
})
```

**Why clone?** `request.text()` / `.json()` consume the body stream. If your handler also reads the body, the second reader gets an error. Always `request.clone()` inside event listeners.

### `server.listHandlers()`

Returns the current handler array. Useful for sanity checks during debugging:

```ts
import { RequestHandler } from 'msw'

const httpHandlers = server
  .listHandlers()
  .filter((h) => h instanceof RequestHandler)
console.log('Active handlers:', httpHandlers.length)
```

Not something you reach for in assertions — it's a debug tool.

---

## 8. `bypass()` and `passthrough()`

Docs: [bypass](https://mswjs.io/docs/api/bypass) · [passthrough](https://mswjs.io/docs/api/passthrough)

Both exist to let requests escape MSW. Distinction:

- **`passthrough()`** — `return passthrough()` from inside a resolver. MSW lets the originally-intercepted request proceed to the real network as-is. **Zero extra requests.**

  ```ts
  import { http, passthrough, HttpResponse } from 'msw'

  http.get('https://brew.new/api/v1/contacts/:email', ({ request }) => {
    if (request.headers.get('x-real-call') === '1') return passthrough()
    return HttpResponse.json({ id: 'mocked' })
  })
  ```

- **`bypass(request)`** — produces a `Request` object that, when you `fetch(bypass(request))`, will never be intercepted. Results in an **additional** request to the real network. Use this when you want to patch a real response with mocked fields.

  ```ts
  import { http, bypass, HttpResponse } from 'msw'

  http.get('https://api.github.com/users/:name', async ({ request }) => {
    const real = await fetch(bypass(request))
    const data = await real.json()
    return HttpResponse.json({ ...data, name: 'Mocked' })
  })
  ```

### Are these useful for the SDK test suite?

**Almost never.** The SDK tests should mock the entire Brew surface — hitting real endpoints during unit tests is a red flag. The only legitimate uses:

- Contract tests run in a separate CI job that deliberately talks to a staging environment.
- Debugging a handler-matching issue where you want to temporarily passthrough to see the real response shape.

For normal TDD, ignore `bypass` and `passthrough`.

---

## 9. Request body introspection

Docs: [Response resolver](https://mswjs.io/docs/basics/response-resolver)

v2 does **not** auto-parse bodies (v1 did). You explicitly call a Fetch body method:

```ts
http.post('https://brew.new/api/v1/contacts', async ({ request }) => {
  const json = await request.json() // any (type via generics)
  const text = await request.text() // string
  const form = await request.formData() // FormData
  const buf = await request.arrayBuffer() // ArrayBuffer

  return HttpResponse.json({ ok: true })
})
```

### Body can only be read ONCE

A `Request` body is a stream. The first `.json()` / `.text()` / `.formData()` / `.arrayBuffer()` consumes it. A second read throws `TypeError: Body has already been read`.

If you need to both assert in an event listener AND read it in the handler, **clone first**:

```ts
server.events.on('request:start', async ({ request }) => {
  const body = await request.clone().json() // clone so the handler can still read
  capturedBodies.push(body)
})

server.use(
  http.post('https://brew.new/api/v1/contacts', async ({ request }) => {
    const body = await request.json() // still works, original untouched
    return HttpResponse.json({ id: 'x', ...body })
  })
)
```

Rule of thumb: in the handler, read directly. In event listeners, always `clone()`.

---

## 10. Type safety patterns

Docs: [TypeScript](https://mswjs.io/docs/best-practices/typescript)

### Sharing types between SDK and handlers

Put request/response types in `src/types.ts` (or OpenAPI-generated output). Import them in **both** the SDK and the MSW handlers so a type mismatch surfaces as a test/compile error.

```ts
// src/types.ts
export type Contact = { id: string; email: string; createdAt: string }
export type CreateContactRequest = { email: string; firstName?: string }

// src/contacts.ts (SDK)
import type { Contact, CreateContactRequest } from './types'
export async function createContact(
  body: CreateContactRequest
): Promise<Contact> {
  /* ... */
}

// tests/msw/handlers.ts
import type { Contact, CreateContactRequest } from '../../src/types'

http.post<never, CreateContactRequest, Contact>(
  'https://brew.new/api/v1/contacts',
  async ({ request }) => {
    const body = await request.json() // CreateContactRequest
    return HttpResponse.json({
      id: 'abc',
      email: body.email,
      createdAt: new Date().toISOString(),
    }) // must satisfy Contact or this fails to compile
  }
)
```

### Typed handler factories

For repeated patterns (e.g. "respond with a Brew error envelope") build a helper that preserves types:

```ts
import {
  HttpResponse,
  type DefaultBodyType,
  type HttpResponseResolver,
  type PathParams,
} from 'msw'

type BrewErrorEnvelope = {
  error: { type: string; code: string; message: string; requestId?: string }
}

export function brewError(
  status: number,
  code: string,
  type: string,
  message: string,
  extraHeaders: Record<string, string> = {}
) {
  return HttpResponse.json<BrewErrorEnvelope>(
    { error: { type, code, message } },
    {
      status,
      headers: {
        'x-request-id': `req_${Math.random().toString(36).slice(2)}`,
        ...extraHeaders,
      },
    }
  )
}

// usage
server.use(
  http.get('https://brew.new/api/v1/contacts/:email', () =>
    brewError(404, 'contact_not_found', 'not_found', 'no such contact')
  )
)
```

### `HttpResponseResolver` generic

For higher-order resolvers (retry simulators, latency injectors) use the exported `HttpResponseResolver` type:

```ts
import {
  delay,
  type HttpResponseResolver,
  type DefaultBodyType,
  type PathParams,
} from 'msw'

function withDelay<
  P extends PathParams,
  Req extends DefaultBodyType,
  Res extends DefaultBodyType,
>(
  ms: number,
  resolver: HttpResponseResolver<P, Req, Res>
): HttpResponseResolver<P, Req, Res> {
  return async (...args) => {
    await delay(ms)
    return resolver(...args)
  }
}
```

---

## 11. Common pitfalls + best practices

Docs: [Life-cycle events](https://mswjs.io/docs/api/life-cycle-events) · [Network behavior overrides](https://mswjs.io/docs/best-practices/network-behavior-overrides)

- **ALWAYS** `server.close()` in `afterAll`. Leaking the interception into subsequent processes/tests causes ghost failures.
- **ALWAYS** `server.resetHandlers()` in `afterEach`. Otherwise `server.use()` overrides from one test leak into the next.
- **ALWAYS** `onUnhandledRequest: 'error'` for the SDK. An unhandled request means the test is broken — fail loudly.
- **Clone** the request (`request.clone()`) in `request:start` listeners before reading the body. Don't consume the original.
- **Handler priority**: `server.use()` **prepends** — the most recently added matching handler wins. Initial handlers from `setupServer()` are last-resort fallbacks.
- **Don't share state across tests** via module-level closures (counters, captured arrays, etc.) without resetting in `beforeEach`. It's a common source of flakes.
- **Don't mutate initial handlers** with `resetHandlers(...newHandlers)` unless you genuinely want to replace the baseline. The docs specifically warn against this: _"Mutating the initial request handlers is generally not recommended because it harms the predictability of the network."_
- **Absolute URLs** for Brew handlers. This prevents relative-URL false positives and makes the test fixture self-documenting.
- **Body is single-read**. Inside a resolver, pick one of `.json()` / `.text()` / `.formData()` / `.arrayBuffer()`. If you need two, clone.
- **`removeAllListeners()`** in `afterEach` if you attached event listeners in `beforeEach`. Otherwise they stack.
- **Retries with once-handlers**: registering multiple `{ once: true }` handlers for the same route is the cleanest way to simulate a sequence. They're consumed in the order they were added to `server.use()`.
- **`HttpResponse.error()`** can't carry a custom message. If your SDK branches on error message strings, refactor it to branch on presence-of-Response instead.
- **`delay()` without args is a no-op in Node tests.** Use explicit ms values or `'infinite'` for timing-sensitive tests.

---

## 12. Concrete end-to-end example

A copy-pasteable starting point for the SDK tests. Assumes the SDK exposes a `BrewClient` class with a `contacts` resource.

### `tests/msw/handlers.ts`

```ts
import { http, HttpResponse } from 'msw'

type Contact = { id: string; email: string; createdAt: string }
type CreateContactRequest = { email: string; firstName?: string }

export const handlers = [
  // GET /v1/contacts/:email — default 200
  http.get<{ email: string }, never, Contact>(
    'https://brew.new/api/v1/contacts/:email',
    ({ params }) => {
      return HttpResponse.json(
        {
          id: 'ct_default',
          email: params.email,
          createdAt: '2026-01-01T00:00:00Z',
        },
        { headers: { 'x-request-id': 'req_default' } }
      )
    }
  ),

  // POST /v1/contacts — default 201
  http.post<never, CreateContactRequest, Contact>(
    'https://brew.new/api/v1/contacts',
    async ({ request }) => {
      const body = await request.json()
      return HttpResponse.json(
        {
          id: 'ct_new',
          email: body.email,
          createdAt: '2026-01-01T00:00:00Z',
        },
        { status: 201, headers: { 'x-request-id': 'req_create' } }
      )
    }
  ),
]
```

### `tests/msw/server.ts`

```ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

### `tests/setup.ts`

```ts
import { beforeAll, afterEach, afterAll } from 'vitest'
import { server } from './msw/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  server.events.removeAllListeners()
})
afterAll(() => server.close())
```

Wire it up in `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.ts'],
  },
})
```

### `tests/contacts.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse, delay } from 'msw'
import { server } from './msw/server'
import { BrewClient } from '../src/client'
import { BrewApiError } from '../src/errors'

const BASE = 'https://brew.new/api/v1'

describe('contacts', () => {
  let client: BrewClient

  beforeEach(() => {
    client = new BrewClient({
      apiKey: 'test_key',
      baseUrl: BASE,
      // aggressive retry config so the tests finish fast
      retry: { maxRetries: 3, minDelayMs: 1, maxDelayMs: 5 },
    })
  })

  // ----- success path -----
  it('returns a contact on 200', async () => {
    server.use(
      http.get(`${BASE}/contacts/:email`, ({ params }) => {
        return HttpResponse.json(
          {
            id: 'ct_1',
            email: params.email,
            createdAt: '2026-04-01T00:00:00Z',
          },
          { headers: { 'x-request-id': 'req_success' } }
        )
      })
    )

    const contact = await client.contacts.get('alice@example.com')
    expect(contact).toEqual({
      id: 'ct_1',
      email: 'alice@example.com',
      createdAt: '2026-04-01T00:00:00Z',
    })
  })

  // ----- error mapping -----
  it('maps 404 to a typed BrewApiError', async () => {
    server.use(
      http.get(`${BASE}/contacts/:email`, () => {
        return HttpResponse.json(
          {
            error: {
              type: 'not_found',
              code: 'contact_not_found',
              message: 'No contact with that email',
            },
          },
          {
            status: 404,
            headers: { 'x-request-id': 'req_404' },
          }
        )
      })
    )

    await expect(
      client.contacts.get('ghost@example.com')
    ).rejects.toMatchObject({
      name: 'BrewApiError',
      status: 404,
      code: 'contact_not_found',
      type: 'not_found',
      requestId: 'req_404',
    })
  })

  // ----- retry on 503 -----
  it('retries twice then succeeds (503, 503, 200)', async () => {
    let calls = 0
    server.use(
      http.post(`${BASE}/contacts`, async ({ request }) => {
        calls++
        if (calls < 3) {
          return HttpResponse.json(
            {
              error: {
                type: 'server_error',
                code: 'unavailable',
                message: 'down',
              },
            },
            { status: 503 }
          )
        }
        const body = (await request.json()) as { email: string }
        return HttpResponse.json(
          {
            id: 'ct_retry',
            email: body.email,
            createdAt: '2026-04-01T00:00:00Z',
          },
          { status: 201, headers: { 'x-request-id': 'req_retry_ok' } }
        )
      })
    )

    const contact = await client.contacts.create({ email: 'bob@example.com' })
    expect(calls).toBe(3)
    expect(contact.id).toBe('ct_retry')
  })

  // ----- Retry-After header honored on 429 -----
  it('honors Retry-After on 429', async () => {
    let calls = 0
    const timestamps: number[] = []

    server.use(
      http.post(`${BASE}/contacts`, async ({ request }) => {
        timestamps.push(Date.now())
        calls++
        if (calls === 1) {
          return HttpResponse.json(
            {
              error: {
                type: 'rate_limited',
                code: 'too_many_requests',
                message: 'slow down',
              },
            },
            { status: 429, headers: { 'retry-after': '1' } }
          )
        }
        const body = (await request.json()) as { email: string }
        return HttpResponse.json(
          { id: 'ct_rl', email: body.email, createdAt: '2026-04-01T00:00:00Z' },
          { status: 201 }
        )
      })
    )

    const contact = await client.contacts.create({ email: 'carol@example.com' })
    expect(calls).toBe(2)
    expect(contact.id).toBe('ct_rl')
    // gap between first and second call should be ~1000ms (retry-after: 1)
    expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(900)
  })

  // ----- Idempotency-Key sent on POST -----
  it('generates an Idempotency-Key on POST', async () => {
    const received: string[] = []
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'POST') {
        received.push(request.headers.get('idempotency-key') ?? '')
      }
    })

    await client.contacts.create({ email: 'dave@example.com' })

    expect(received).toHaveLength(1)
    expect(received[0]).toMatch(/^[0-9a-f-]{36}$/i) // UUID-ish
  })

  // ----- network error -----
  it('retries on network error then fails', async () => {
    let calls = 0
    server.use(
      http.post(`${BASE}/contacts`, () => {
        calls++
        return HttpResponse.error()
      })
    )

    await expect(
      client.contacts.create({ email: 'err@example.com' })
    ).rejects.toThrow()
    expect(calls).toBe(4) // initial + 3 retries
  })

  // ----- timeout via delay('infinite') -----
  it('aborts when the server hangs longer than timeoutMs', async () => {
    server.use(
      http.get(`${BASE}/contacts/:email`, async () => {
        await delay('infinite')
        return HttpResponse.json({ id: 'never' })
      })
    )

    const slowClient = new BrewClient({
      apiKey: 'k',
      baseUrl: BASE,
      timeoutMs: 50,
    })
    await expect(slowClient.contacts.get('slow@example.com')).rejects.toThrow(
      /abort/i
    )
  })

  // ----- raw: true exposes headers -----
  it('raw: true returns parsed data plus response headers', async () => {
    server.use(
      http.get(`${BASE}/contacts/:email`, ({ params }) => {
        return HttpResponse.json(
          {
            id: 'ct_raw',
            email: params.email,
            createdAt: '2026-04-01T00:00:00Z',
          },
          {
            headers: {
              'x-request-id': 'req_raw',
              'x-ratelimit-remaining': '42',
            },
          }
        )
      })
    )

    const result = await client.contacts.get('eve@example.com', { raw: true })
    expect(result.data.id).toBe('ct_raw')
    expect(result.status).toBe(200)
    expect(result.headers.get('x-request-id')).toBe('req_raw')
    expect(result.headers.get('x-ratelimit-remaining')).toBe('42')
  })
})
```

That covers: success, error mapping, retry on 503, Retry-After on 429, idempotency key assertion via events, network error retry, timeout via `delay('infinite')`, and `raw: true` header exposure. It should be a complete TDD starting surface for the contacts resource.
