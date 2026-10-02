# Retries + idempotency

The SDK retries transient failures by default. The retry policy is
designed to be **safe** — never retry a request whose retry could cause
a duplicate write — and **boring** — exponential backoff with full
jitter, no exotic strategies.

## What gets retried

### By status code

Retried (transient):

- `408 Request Timeout`
- `429 Too Many Requests`
- `500 Internal Server Error`
- `502 Bad Gateway`
- `503 Service Unavailable`
- `504 Gateway Timeout`

NOT retried (caller error or permanent):

- `400 Bad Request`
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found`
- `409 Conflict`
- `422 Unprocessable Entity`

### By HTTP method

| Method   | Retry policy                                                      |
| -------- | ----------------------------------------------------------------- |
| `GET`    | Always retried on transient failures — safe by HTTP semantics.    |
| `PUT`    | Always retried — PUT is idempotent by HTTP semantics.             |
| `DELETE` | Always retried — re-deleting a missing resource is safe.          |
| `POST`   | Retried **only when an idempotency key is attached** (see below). |
| `PATCH`  | **Never retried**, even with an idempotency key.                  |

Two image-upload requests are exceptions:

- `content.createImageUpload` (and the first step of `content.uploadImage`)
  is sent **without** an idempotency key and **not retried by default**.
  The API never replays it (its answer carries a one-time upload URL), so
  a retry after a lost answer would open a second upload that holds one of
  the brand's 20 upload slots for 15 minutes. The client-wide `maxRetries`
  does not apply; a `maxRetries` passed on the request opts in.
- `content.uploadImage` POSTs the file's bytes to the upload's own
  `uploadUrl`, not to the API, and without an idempotency key. That POST is
  still retried like a keyed one: the URL names the one upload it fills,
  and a repeat never replaces the file that landed first. Its transport
  errors leave the URL's token out of `url`, `message` and `cause`.

### Why PATCH is never retried

`PATCH` is a partial-update primitive. The server's view of "current
state" may have shifted between attempts — if the first PATCH actually
succeeded but the response was lost on the way back, retrying the same
PATCH against the now-mutated state can produce a different result than
the original. This is too subtle to make safe by default, so the SDK
opts out entirely.

If you need PATCH-with-retries, perform a fresh `search` (with an `email`
equality filter) first to re-read the current state, then issue the PATCH
against that snapshot.

### By cause

| Cause                                                                                                                 | Retried?                                              | Thrown when it is the last attempt |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------- |
| Retryable status (`408`, `429`, 5xx)                                                                                  | Per the method policy                                 | `BrewApiError`                     |
| Connection failure: DNS, TCP, TLS, a rejected `fetch`, **or the connection dropping while the response body streams** | Per the method policy                                 | `BrewConnectionError`              |
| Timeout: `timeoutMs` passed — waiting for headers **or reading the body** — or the HTTP runtime gave up first         | Per the method policy, unless `retryOnTimeout: false` | `BrewTimeoutError`                 |
| Caller abort (a `signal` you passed, request- or client-level), with any `reason`                                     | **Never**                                             | the signal's `reason`, verbatim    |
| A 2xx whose body is complete but not JSON                                                                             | **Never** — the same bytes would come back            | `BrewParseError`                   |

A connection or timeout failure has an **unknown outcome**: the server may
have finished the work, may still be doing it, or may never have seen the
request. That is why a write only retries with an idempotency key — see
[Recovering after an unknown outcome](#recovering-after-an-unknown-outcome).

Set `retryOnTimeout: false` (client-wide or per request) when a deadline
should be a hard stop — one attempt, then `BrewTimeoutError`:

```ts
await brew.emails.generate({ prompt }, { retryOnTimeout: false })
```

### Discarded attempts release their connection

When a retryable response is thrown away, the SDK aborts that attempt
before backing off, so the runtime closes its connection immediately
instead of leaving the server streaming into a response nobody will
read until it is garbage collected.

## Backoff

Exponential with full jitter, capped:

```
delay_ms = floor( min(baseMs * 2^attempt, maxMs) * random() )
```

Where:

- `baseMs` = 100 (internal default)
- `maxMs` = 10_000
- `attempt` = 0 for the first retry, 1 for the second, etc.
- `random()` returns a value in `[0, 1]` — full jitter, AWS-recommended
  for thundering-herd avoidance on shared downstream dependencies

So with default settings:

- Retry 1: `0..100ms`
- Retry 2: `0..200ms`
- Retry 3: `0..400ms`
- Retry 4: `0..800ms`
- Retry 5: `0..1600ms`
- ...capped at 10s

`maxRetries` defaults to 2 (so at most 3 total attempts). Override per
client or per request — see
[configuration.md](./configuration.md#maxretries).

## `Retry-After` honoring

If a retryable response includes a `Retry-After` header, the SDK uses
that value verbatim instead of computing its own backoff. The server is
authoritative — it knows when the rate limit resets, and undercutting
its hint with a shorter backoff just gets you another 429.

The SDK waits out at most **60 seconds** (`MAX_RETRY_AFTER_MS`; every
Brew rate-limit window is 60 s). A longer `Retry-After` is not retried —
sleeping minutes inside one call is indistinguishable from a hang — and
the `BrewApiError` is thrown with `retryAfter` set, so you can schedule
the retry yourself.

A caller abort ends a backoff immediately; the request rejects with the
signal's `reason`.

The Brew API emits `Retry-After` as **delta-seconds**. The HTTP-date
form is intentionally not supported because the public contract does
not emit it.

## Idempotency keys

POST is the dangerous method — retrying a POST that the server already
processed once causes a duplicate write. The SDK avoids this by
attaching an `Idempotency-Key` header to every POST it sends.

### Auto-generated keys

By default, every POST gets a fresh
[RFC 4122 v4 UUID](https://datatracker.ietf.org/doc/html/rfc4122) as
its `Idempotency-Key`:

```ts
await brew.contacts.upsert({ email: 'jane@example.com' })
// Sends: Idempotency-Key: a3f2e1c4-…-…-…-…
```

This is what makes POST safe to retry — the server deduplicates by
key, so a transient failure followed by a retry produces exactly one
write regardless of how many round-trips happened.

### Caller-provided keys

When you have an upstream queue or workflow that already provides a
deduplication identifier, pass it via `RequestOptions.idempotencyKey`:

```ts
await brew.contacts.upsert(
  { email: 'jane@example.com' },
  { idempotencyKey: `queue_msg_${queueMessage.id}` }
)
```

Caller-provided keys win verbatim — no prefix, no wrapping. Use any
string the server accepts.

Every attempt of one call — the first and each retry — carries the
**same** key. A new key would turn a replay into a second write.

### What does NOT carry an idempotency key

`GET`, `DELETE` and `PUT` requests **never** send `Idempotency-Key`,
even if you pass one in `RequestOptions`. `PATCH` sends only a key you
pass (the API honors it on `PATCH /v1/emails/{id}`) and never generates
one — and `PATCH` is never retried either way.

### Recovering after an unknown outcome

A timeout, a dropped connection or your own cancel tells you nothing
about whether the server did the work. **Cancelling does not stop work
the server has started.** To finish a write without doing it twice,
replay it later with the key it was sent with. Every SDK error carries
that key, including one the SDK generated. A cancel rejects with your
own `reason` instead, so on a write you might cancel, pass your own
`idempotencyKey` and keep it:

```ts
import { BrewTransportError } from '@brew.new/sdk'

try {
  await brew.emails.generate({ prompt })
} catch (error) {
  if (error instanceof BrewTransportError && error.idempotencyKey) {
    // Keep the key with the job and retry it later.
    await jobs.retryLater({ prompt, idempotencyKey: error.idempotencyKey })
    return
  }
  throw error
}

// Later: the same body and the same key. The server replays the result of
// the first attempt instead of generating a second email.
await brew.emails.generate({ prompt }, { idempotencyKey })
```

`error.idempotencyKey` is on `BrewTimeoutError`, `BrewConnectionError`
and `BrewApiError` alike.

The server holds a key "in progress" while its first attempt runs (up
to 15 minutes), and answers any other request with that key
`409 IDEMPOTENCY_IN_PROGRESS`. When the SDK's own retry gets that answer
after a timeout or dropped connection, it throws the original
`BrewTimeoutError` / `BrewConnectionError` with `inProgress: true` — the
work is still running — rather than a conflict. Wait, then replay with
the same key. A completed key replays its stored result for 24 hours.

The replay guarantee needs the API's idempotency store. While it is
degraded, real sends refuse with a retryable `503` rather than risk sending
twice, and other writes run without the guarantee. So for a write that must
not happen twice (creating a brand, say), pass `maxRetries: 0` on that call
— otherwise the SDK's own retry after a timeout or dropped connection can
re-run it before you can look — and check whether the first attempt landed
before you retry it yourself.

## Caps and worst-case behavior

The retry loop has hard upper bounds:

- **Per-request attempts**: `maxRetries + 1` total HTTP calls.
- **Per-attempt timeout**: `timeoutMs` (default 30s), covering the
  **whole** attempt: connecting, waiting for the headers, and reading
  the response body.
- **Wall-clock budget**: roughly `(maxRetries + 1) * timeoutMs` plus
  the sum of backoffs. With defaults, that's about 90 seconds before a
  request gives up entirely. Long-running methods raise `timeoutMs`
  per call (see [configuration.md](./configuration.md#timeoutms)), so
  their worst case is longer — unless a retry finds the first attempt
  still in progress, which ends the call at once (above).

If you need a tighter total budget, pass a caller `AbortSignal` from
`AbortSignal.timeout(ms)`:

```ts
await brew.contacts.search(
  { limit: 100 },
  { signal: AbortSignal.timeout(10_000) }
)
```

That signal stops the request wherever it is — connecting, reading the
body, or backing off — and since caller aborts are never retried, the
request fails fast. It rejects with that signal's reason: a
`DOMException` whose `name` is `'TimeoutError'`.
