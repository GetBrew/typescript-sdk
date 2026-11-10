# Email webhooks

`brew.webhooks` manages brand-scoped email lifecycle and engagement subscriptions.
Use the `emails` API scope and select a brand for organization credentials.

```ts
const endpoint = await brew.webhooks.create({
  endpoint: 'https://example.com/webhooks/brew',
  events: ['email.delivered', 'email.bounced', 'email.complained'],
})
// Store endpoint.signing_secret in your server's secret manager.

const event = await brew.webhooks.verify({
  payload: await request.text(),
  headers: {
    id: request.headers.get('svix-id') ?? '',
    timestamp: request.headers.get('svix-timestamp') ?? '',
    signature: request.headers.get('svix-signature') ?? '',
  },
  webhookSecret: process.env.BREW_WEBHOOK_SECRET!,
})
```

Verification uses Web Crypto and rejects timestamps outside five minutes. It
throws `BrewWebhookVerificationError`, whose `reason` is `headers`, `timestamp`,
`signature` or `payload`; answer `400` so the provider retries. Verify the
unmodified raw body: a string, or its bytes (an Express `raw()` `Buffer`).
`verifyWebhook` is also exported independently of the client, so a receiver
needs no API key.

Only the signature is authority. Brew adds event types and fields over time,
and `verify` returns any signed event envelope, so give your `switch
(event.type)` a default branch that acknowledges unknown types.

Methods: `list`, `create`, `get`, `update`, `delete`, `rotateSecret`, `test`,
`events`, `attempts`, `replay`, and `verify`. Identity-only methods take their
IDs positionally (`get(webhookId)`, `replay(webhookId, eventId)`); methods with
bodies or queries take an object. HTTP methods support the shared
`RequestOptions`, including `raw: true`, cancellation and idempotency keys.
For a manual retry after an uncertain creation response, reuse the same
`idempotencyKey` for the unchanged request. Use a new key for a changed request
or a new creation after confirmed success.

```ts
const page = await brew.webhooks.events({ webhookId: endpoint.id, limit: 20 })
const delivery = page.data[0]
if (delivery?.payload) {
  await brew.webhooks.replay(endpoint.id, delivery.id)
}
```

Delivery is at least once and unordered. Deduplicate on the `svix-id` header.
`event.data.brew.event_id` names the underlying email fact; test events
(`data.brew.test: true`) all reuse one fixture `event_id`, so leave them out if
you deduplicate on it. Replay sends the same notification again, with the same
`svix-id`, without sending an email or changing email statistics. Customer event payload retention is 30 days; synthetic
fixtures may follow a different provider retention period.

`data.email_id` identifies a message, while `data.brew.design_id` identifies its
reusable design. Open/click events are raw tracking observations and may come
from scanners and privacy proxies. They do not establish human engagement or
inbox placement. Brew's final dashboard statistics apply additional filtering.

`email.failed` includes provider-reported failures and definitive recipient
rejections before acceptance. Pre-acceptance rejections count as pre-send skips
in analytics and do not reduce pending accepted messages. Rendering, admission,
and sender configuration failures do not emit lifecycle webhooks. Message
acceptance time uses mapping or provider evidence when available; otherwise
`data.created_at` falls back to the event occurrence time.

Bounce details can include `bounce.diagnosticCode`, an array of SMTP response
strings. Secret-rendered messages omit these diagnostics and free-form
`bounce.message` while retaining the bounce classification.
