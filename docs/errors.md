# Error handling

Every non-2xx response from the Brew API — and every network failure
the SDK gives up on after retries are exhausted — surfaces as a single
typed error class: **`BrewApiError`**. One `catch` branch covers every
failure mode.

## The error shape

```ts
import { BrewApiError } from '@brew.new/sdk'

class BrewApiError extends Error {
  readonly status: number // HTTP status (404, 500, …)
  readonly code: string // API code, e.g. 'contact_not_found'
  readonly type: string // API type, e.g. 'not_found'
  readonly message: string // Human-readable explanation
  readonly requestId: string | undefined // From the x-request-id header
  readonly retryAfter: number | undefined // Delta-seconds from Retry-After
  readonly suggestion: string | undefined // Optional remediation hint
  readonly docs: string | undefined // Optional docs URL
}
```

`BrewApiError` extends `Error`, so `instanceof Error` and
`instanceof BrewApiError` both hold. The `name` field is `'BrewApiError'`.

## The catch pattern

```ts
import { BrewApiError, createBrewClient } from '@brew.new/sdk'

const brew = createBrewClient({ apiKey: process.env.BREW_API_KEY! })

try {
  const contact = await brew.contacts.getByEmail({
    email: 'missing@example.com',
  })
  return contact
} catch (error) {
  if (error instanceof BrewApiError) {
    if (error.code === 'contact_not_found') {
      return null
    }
    if (error.status === 429) {
      console.warn(`Rate limited. Retry after ${error.retryAfter}s.`)
      throw error
    }
    console.error(
      `Brew API error: ${error.code} (request ${error.requestId ?? 'unknown'})`
    )
  }
  throw error
}
```

A few rules:

- **Always re-throw what you do not understand.** A bare `catch` that
  swallows everything will hide bugs. Re-throw any `BrewApiError` whose
  `code` you do not explicitly handle.
- **Use `requestId` for support.** When you escalate to Brew support,
  including the `requestId` lets them find the exact failed request in
  their logs in seconds. Always log it.
- **Trust the SDK's retry decisions.** If a `BrewApiError` lands in
  your code path, every retry the SDK was allowed to make has already
  failed. Wrapping the call in your own retry loop on top is almost
  always wrong — adjust the SDK's `maxRetries` or `timeoutMs` instead.

## Error envelope mapping

The Brew API emits errors with a consistent envelope:

```json
{
  "code": "validation_failed",
  "type": "invalid_request",
  "message": "email must be a valid email",
  "suggestion": "Use a valid RFC 5322 address.",
  "docs": "https://brew.new/docs/errors#validation_failed"
}
```

`BrewApiError.fromResponse()` maps this envelope onto the error class
1:1, and pulls `requestId` from the `x-request-id` header and
`retryAfter` from the `Retry-After` header. If the response body is not
a valid envelope (e.g. an HTML 502 from an upstream proxy), the error
falls back to a generic `code: 'unknown_error'` rather than throwing
from the error path.

## What about network failures?

A network failure (DNS resolution, TCP reset, fetch reject) becomes a
`BrewApiError` only AFTER all retry attempts have been exhausted. The
SDK retries network errors by default for safe methods (`GET`, `PUT`,
`DELETE`) and for `POST` when an idempotency key is attached. See
[retries-and-idempotency](./retries-and-idempotency.md) for the full
matrix.

If retries do not save the request, the SDK throws the underlying
`Error` directly (it does NOT wrap it in `BrewApiError` because there
is no HTTP envelope to map). You should still expect both shapes from a
defensive `catch`:

```ts
try {
  await brew.contacts.list()
} catch (error) {
  if (error instanceof BrewApiError) {
    // API responded with a non-2xx
  } else if (error instanceof Error) {
    // Network/transport failure after retries — error.message has details
  }
  throw error
}
```

## Caller-initiated aborts

Aborts triggered by your own `AbortSignal` are NEVER retried — they are
intentional, and rethrown as the original `AbortError`. Check for
abort separately if you handle it specially:

```ts
const controller = new AbortController()
setTimeout(() => controller.abort(), 5_000)

try {
  await brew.contacts.list({ limit: 100 }, { signal: controller.signal })
} catch (error) {
  if (error instanceof Error && error.name === 'AbortError') {
    console.log('Request was aborted by the caller — no retry attempted.')
    return
  }
  throw error
}
```
