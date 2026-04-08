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

### Why PATCH is never retried

`PATCH` is a partial-update primitive. The server's view of "current
state" may have shifted between attempts — if the first PATCH actually
succeeded but the response was lost on the way back, retrying the same
PATCH against the now-mutated state can produce a different result than
the original. This is too subtle to make safe by default, so the SDK
opts out entirely.

If you need PATCH-with-retries, perform a fresh `getByEmail` first to
re-read the current state, then issue the PATCH against that snapshot.

### By cause

- **Network errors** (DNS failure, TCP reset, fetch reject) follow the
  same method policy as status-code failures. A network error on `GET`
  retries; a network error on `POST` without an idempotency key does
  not.
- **Caller aborts** (an `AbortSignal` you passed) are **never retried**.
  See [errors.md](./errors.md#caller-initiated-aborts).

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

If a 429 response includes a `Retry-After` header, the SDK uses that
value verbatim instead of computing its own backoff. The server is
authoritative — it knows when the rate limit resets, and undercutting
its hint with a shorter backoff just gets you another 429.

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

### What does NOT carry an idempotency key

`GET`, `DELETE`, `PUT`, and `PATCH` requests **never** send
`Idempotency-Key`, even if you pass one in `RequestOptions`. The Brew
API contract only honors the header on `POST`, and attaching it to
other methods would be misleading at best.

## Caps and worst-case behavior

The retry loop has hard upper bounds:

- **Per-request attempts**: `maxRetries + 1` total HTTP calls.
- **Per-attempt timeout**: `timeoutMs` (default 30s).
- **Wall-clock budget**: roughly `(maxRetries + 1) * timeoutMs` plus
  the sum of backoffs. With defaults, that's about 90 seconds before a
  request gives up entirely.

If you need a tighter total budget, pass a caller `AbortSignal` from
`AbortSignal.timeout(ms)`:

```ts
await brew.contacts.list(
  { limit: 100 },
  { signal: AbortSignal.timeout(10_000) }
)
```

That signal aborts the in-flight fetch immediately when it fires, and
since caller aborts are never retried, the request fails fast.
