# `brew.sends`

Send **lifecycle** actions. A send is created via
[`brew.emails.send`](./emails.md#send) (`POST /v1/sends`); this namespace
carries the actions you take on a send _after_ it exists. Send **reads**
(lifecycle, stats, per-recipient events) live on `brew.analytics.sends.*`;
see [`docs/analytics.md`](./analytics.md#sends).

| Method              | HTTP                              | Scope   |
| ------------------- | --------------------------------- | ------- |
| [`cancel`](#cancel) | `POST /v1/sends/{sendId}/cancel`  | `sends` |

## Shared types

```ts
type SendCancelResponse = {
  readonly sendId: string
  readonly status: 'canceled'
}
```

## `cancel`

Cancel a scheduled or queued send before it goes out, identified entirely
by the `sendId` returned from `brew.emails.send(...)`. Requires the
`sends` scope.

```ts
const result = await brew.sends.cancel('snd_8fK2mQ4p')
// { sendId: 'snd_8fK2mQ4p', status: 'canceled' }
```

The action is **idempotent** — a send that is already `canceled` resolves
`200` with the same body, so retries are safe. Supply
`{ idempotencyKey }` to make a retried cancel return the original
response; one is generated automatically otherwise (see
[`docs/retries-and-idempotency.md`](./retries-and-idempotency.md)).

```ts
await brew.sends.cancel('snd_8fK2mQ4p', { idempotencyKey: 'cancel-001' })
```

### Errors

- **`409 SEND_NOT_CANCELLABLE`** — the send has already started or
  finished (`sending`, `sent`, or `failed`) and can no longer be stopped.
- **`404`** — unknown or cross-brand `sendId` (sends are brand-scoped to
  the key).

Pass `{ raw: true }` in `options` to receive the full
`BrewRawResponse<SendCancelResponse>` (status, headers, request id)
instead of the unwrapped payload.
