# Error handling

Every failure the SDK gives up on is typed, and which type tells you
what you know about the request:

| Thrown                                         | Means                                                                                                             |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `BrewApiError`                                 | The server answered with a non-2xx status. `status`, `code` and the rest of the envelope say what it said.        |
| `BrewTimeoutError` (a `BrewTransportError`)    | No complete answer within `timeoutMs` — waiting for the headers or reading the body. **Outcome unknown.**         |
| `BrewConnectionError` (a `BrewTransportError`) | The connection failed, or dropped while the body streamed. **Outcome unknown.** The original error is on `cause`. |
| `BrewParseError`                               | The server answered 2xx, but the body was not JSON. Report it with `requestId`.                                   |
| your signal's `reason`                         | You cancelled — the `signal` you passed (request- or client-level) aborted.                                       |

All four classes extend `Error`, so the two-branch pattern below —
`BrewApiError` for API errors, `Error` for everything else — covers
every case.

## The error shape

```ts
import {
  BrewApiError,
  type BrewErrorCode,
  type BrewErrorType,
} from '@brew.new/sdk'

class BrewApiError extends Error {
  readonly status: number // HTTP status (404, 500, …)
  readonly code: string // API code, e.g. 'CONTACT_NOT_FOUND'
  readonly type: BrewErrorType // Closed enum, see below
  readonly message: string // Human-readable explanation
  readonly param: string | undefined // Which input field caused the error, when applicable
  readonly suggestion: string // Remediation hint (always present per the API contract)
  readonly docs: string // URL to the relevant docs section
  readonly requestId: string | undefined // From the x-request-id response header
  readonly retryAfter: number | undefined // Delta-seconds: from body envelope or Retry-After header
  readonly details: Record<string, unknown> | undefined // The envelope's `details` object, when sent
  readonly body: unknown // The parsed response body exactly as received
  readonly bodyError: Error | undefined // Set when the body was cut off mid-read (see below)
  readonly idempotencyKey: string | undefined // The Idempotency-Key the request carried
}
```

`BrewApiError` extends `Error`, so `instanceof Error` and
`instanceof BrewApiError` both hold. The `name` field is `'BrewApiError'`.

### Error types

`type` is a closed enum on the wire, so the SDK exposes it as a union
you can branch on with full type safety:

```ts
type BrewErrorType =
  | 'authentication_error'
  | 'authorization_error'
  | 'invalid_request'
  | 'not_found'
  | 'not_implemented'
  | 'conflict'
  | 'rate_limit'
  | 'payment_required'
  | 'service_unavailable'
  | 'internal_error'
```

### Error codes

`error.code` stays a `string` so a code the server ships before the SDK
regenerates still compares cleanly. `BrewErrorCode` is the union of every
code the API documents — import it when you want exhaustive branching:

```ts
import type { BrewErrorCode } from '@brew.new/sdk'

function isRetryableLater(code: BrewErrorCode): boolean {
  return code === 'RATE_LIMITED' || code === 'SERVICE_UNAVAILABLE'
}
```

### Codes that changed in 10.0.0

| Was                             | Now                                 |
| ------------------------------- | ----------------------------------- |
| `INSUFFICIENT_EMAIL_SENDS`      | `SEND_QUOTA_EXCEEDED` (now **402**) |
| `409 PUBLISH_VALIDATION_FAILED` | `422 PUBLISH_VALIDATION_FAILED`     |
| `EVENT_NOT_FOUND`               | `TRIGGER_INSTANCE_NOT_FOUND`        |
| assorted 429 codes              | `RATE_LIMITED` only                 |

`Retry-After` rides the `429` alone now, so `error.retryAfter` is only
populated on a rate-limit error.

An API key bound to ONE BRAND that calls an organization operation — for
example `GET /v1/usage`, which needs organization standing — gets
`403 ORG_SCOPE_REQUIRED`: mint an organization-scoped key. A _person_
without the role still gets `403 INSUFFICIENT_ROLE`. The two are
deliberately distinct, so branch on the code rather than on the status.

```ts
if (error.code === 'ORG_SCOPE_REQUIRED') {
  // The credential is brand-bound. Use an organization-scoped key.
} else if (error.code === 'INSUFFICIENT_ROLE') {
  // The human lacks the role. Ask an org admin.
}
```

A key without a scope the operation needs gets
`403 INSUFFICIENT_PERMISSIONS`. An `include` can need a second scope:
`contacts.get(email, { include: 'openProfile' })` and
`contacts.search({ include: ['openProfile'] })` need `emails` as well as
`contacts`, and without it the whole call fails rather than leaving the
profile out. Retry without the include, or use a key with both scopes.

## The catch pattern

```ts
import { BrewApiError, createBrewClient } from '@brew.new/sdk'

const brew = createBrewClient({ apiKey: process.env.BREW_API_KEY! })

try {
  const { deleted } = await brew.contacts.delete({
    email: 'missing@example.com',
  })
  return deleted
} catch (error) {
  if (error instanceof BrewApiError) {
    if (error.code === 'CONTACT_NOT_FOUND') {
      return 0
    }
    if (error.type === 'rate_limit') {
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
- **Branch on `type` for category, on `code` for specifics.** `type`
  is the closed enum (all `not_found` errors), `code` is the specific
  identifier (`CONTACT_NOT_FOUND`, `FIELD_NOT_FOUND`).

## Error envelope mapping

The Brew API wraps every error in a consistent envelope:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "type": "invalid_request",
    "message": "email must be a valid email",
    "param": "email",
    "suggestion": "Use a valid RFC 5322 address.",
    "docs": "https://docs.brew.new/api-reference/api/errors"
  }
}
```

`BrewApiError.fromResponse()` unwraps the `error` key, validates that
`type` is one of the known enum values, and maps every field onto the
class. `requestId` comes from the `x-request-id` response header.
`retryAfter` is read from the body envelope first, then falls back to
the `Retry-After` header — the body wins because it is specific to
the exact error. `details`, when the server attached one, is passed
through untouched.

If the response body is neither envelope (an HTML 502 from an upstream
proxy, an empty body, etc.) the SDK falls back to a generic envelope:
`code: 'unknown_error'`, `type` derived from the HTTP status, a retry
suggestion only for `429`/5xx, and the error-catalogue docs URL — better
to return a readable error than throw from the error path. `body` still
carries whatever was received.

### The legacy fire envelope

`POST`/`GET /v1/automations/triggers/{triggerEventId}/fire` is the one
endpoint outside the `{ error }` convention. Its pipeline answers its
successes and its own refusals — missing key, payload mismatch, unknown
trigger, brand scope, no published automation — with the legacy fire
envelope (a malformed JSON body is refused earlier with the standard
envelope, and the contract documents the route's 401/403/429 as
`ApiErrorEnvelope`; the SDK tries the standard shape first, then this
one, so either is mapped correctly):

```json
{
  "success": false,
  "status": "payload_mismatch",
  "code": "INVALID_PAYLOAD",
  "message": "Payload validation failed.",
  "triggerEventId": "tri_signup",
  "receivedAt": "2026-09-20T10:00:00.000Z",
  "details": {
    "errors": [
      {
        "code": "invalid_type",
        "field": "code",
        "message": "Field \"code\" must be a string",
        "expectedType": "string",
        "actualType": "number"
      }
    ],
    "warnings": [],
    "payloadSchema": { "type": "object", "fields": [] }
  }
}
```

The SDK maps it verbatim: `code` and `message` from the body, `type`
derived from the HTTP status (`401` → `authentication_error`, `403` →
`authorization_error`, `404` → `not_found`, `409` → `conflict`, `429` →
`rate_limit`, any other 4xx → `invalid_request`, 5xx → `internal_error`),
a fix-the-request `suggestion` for any 4xx outside the retry policy (the
same body fails the same way on retry; `408`/`429`/5xx keep retry advice),
the fire reference as `docs`, and `details` — for a `payload_mismatch`,
`errors[]` names every offending field and `payloadSchema` is the schema
to repair against. The envelope's own `status` discriminator is reachable
through `body`:

```ts
try {
  await brew.automations.triggers.fire({ triggerEventId, payload })
} catch (error) {
  if (error instanceof BrewApiError && error.code === 'INVALID_PAYLOAD') {
    const errors = error.details?.errors as
      | Array<{ field: string; message: string }>
      | undefined
    for (const issue of errors ?? []) {
      console.error(`${issue.field}: ${issue.message}`)
    }
  }
  throw error
}
```

### A cut-off error body

When the connection drops — or `timeoutMs` passes — while an error
response's body is still arriving, the SDK still throws the
`BrewApiError` for its status: a `502` is a `502`. The envelope never
finished, so `code` is `'unknown_error'` and the rest is the generic
fallback; `bodyError` holds why, and the message ends with
`(response body was truncated: …)`. A complete body that simply is not
JSON (an HTML page from a proxy) is the ordinary fallback above, with
no `bodyError`.

## Transport failures

A transport failure means no usable answer arrived: there is no status
and no envelope, so it is not a `BrewApiError`. It is a
`BrewTransportError`, thrown only once retries are exhausted (the SDK
retries these for `GET`, `DELETE`, and a `POST` with an idempotency
key — which the SDK attaches automatically; `PATCH` is never retried;
see [retries-and-idempotency](./retries-and-idempotency.md)).

```ts
class BrewTransportError extends Error {
  readonly method: string // 'GET', 'POST', …
  readonly url: string // Full URL. The message leaves the query string out. For an upload URL, the query (its token) is left out of `url`, `message` and `cause`.
  readonly attempts: number // HTTP attempts made, retries included
  readonly idempotencyKey: string | undefined // Replay a write with this key
  readonly inProgress: boolean // A retry found the first attempt still running
  readonly cause: unknown // What the runtime threw, when there was something
}
class BrewTimeoutError extends BrewTransportError {
  readonly timeoutMs: number // The per-attempt deadline that applied
} // name: 'TimeoutError'
class BrewConnectionError extends BrewTransportError {} // name: 'BrewConnectionError'
```

`BrewTimeoutError`'s `name` is `'TimeoutError'` — the platform's name
for this event, the one `AbortSignal.timeout` uses — so name-based
checks written for plain `fetch` keep working; `instanceof
BrewTimeoutError` is the precise one. It also covers the HTTP runtime
giving up first: Node's `fetch` stops waiting after 300 s (see
[configuration.md](./configuration.md#timeoutms)).

**The outcome is unknown.** The server may have finished, may still be
working, or may never have seen the request. Do not resend a write with
a new key — replay it with `error.idempotencyKey`. See
[Recovering after an unknown outcome](./retries-and-idempotency.md#recovering-after-an-unknown-outcome).

The two-branch pattern works unchanged:

```ts
try {
  await brew.contacts.search()
} catch (error) {
  if (error instanceof BrewApiError) {
    // API responded with a non-2xx
  } else if (error instanceof Error) {
    // Transport failure, parse failure, or your own abort
  }
  throw error
}
```

Or branch on what actually happened:

```ts
import {
  BrewApiError,
  BrewParseError,
  BrewTimeoutError,
  BrewTransportError,
} from '@brew.new/sdk'

try {
  await brew.emails.generate({ prompt })
} catch (error) {
  if (error instanceof BrewApiError) {
    // The server said no: branch on error.code.
  } else if (error instanceof BrewTimeoutError) {
    // Too slow. The server may still finish: replay with
    // error.idempotencyKey rather than generating twice.
  } else if (error instanceof BrewTransportError) {
    // Connection failed or dropped. Same advice for a write.
  } else if (error instanceof BrewParseError) {
    // A 2xx that was not JSON: report error.requestId.
  }
  throw error
}
```

## A 2xx that is not JSON

`BrewParseError` means the request reached the server and succeeded
there, but the body that came back — complete — was not JSON. It is not
a transport failure (`instanceof BrewTransportError` is false) and it is
not retried: the same bytes would come back. It carries `status`,
`requestId`, the first 256 characters as `bodyPreview`, and the
`SyntaxError` as `cause`.

## Caller-initiated aborts

Aborts triggered by your own `AbortSignal` — a request's `signal` or
the client's — are NEVER retried: they are intentional. The request
rejects with the signal's `reason` exactly as you gave it: a
`DOMException` named `'AbortError'` for a plain `abort()`, or whatever
you passed to `abort(reason)`. It stops the request wherever it is —
connecting, reading the body, or backing off between retries. Check for
abort separately if you handle it specially:

```ts
const controller = new AbortController()
setTimeout(() => controller.abort(), 5_000)

try {
  await brew.contacts.search({ limit: 100 }, { signal: controller.signal })
} catch (error) {
  if (error instanceof Error && error.name === 'AbortError') {
    console.log('Request was aborted by the caller — no retry attempted.')
    return
  }
  throw error
}
```

Before 11.3.0 an SDK timeout also surfaced as an `AbortError`, so this
check could not tell a timeout from a cancel. A timeout is now a
`BrewTimeoutError` (`name: 'TimeoutError'`), and `'AbortError'` means
only that you cancelled. (A total deadline built from
`AbortSignal.timeout(ms)` and passed as `signal` is your own cancel: it
rejects with that signal's `DOMException`, whose `name` is also
`'TimeoutError'`.)

Cancelling does not stop work the server already started. To finish an
interrupted write without doing it twice, replay it with the same
idempotency key. A cancel rejects with your own `reason`, which carries
no key, so on a write you might cancel, pass your own
`RequestOptions.idempotencyKey` and keep it.
