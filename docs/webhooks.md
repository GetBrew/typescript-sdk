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

Verification uses Web Crypto, rejects timestamps outside five minutes, and throws
`BrewWebhookVerificationError` for invalid signatures or payloads. Verify the
unmodified raw body. `verifyWebhook` is also exported independently of the client.

Methods: `list`, `create`, `get`, `update`, `remove`, `rotateSecret`, `test`,
`events`, `attempts`, `replay`, and `verify`. Identity-only methods take an ID;
methods with bodies or queries take an object. HTTP methods support the shared
`RequestOptions`, including `raw: true`, cancellation and idempotency keys.

```ts
const page = await brew.webhooks.events({ webhookId: endpoint.id, limit: 20 })
const delivery = page.data[0]
if (delivery) {
  await brew.webhooks.replay({ webhookId: endpoint.id, eventId: delivery.id })
}
```

Delivery is at least once and unordered. Deduplicate on `svix-id` or
`event.data.brew.event_id`. Replay sends the same notification again, without
sending an email or changing email statistics. Test fixtures are marked with
`data.brew.test: true`. Payload retention defaults to 30 days.

`data.email_id` identifies a message, while `data.brew.design_id` identifies its
reusable design. Open/click events are raw tracking observations and may come
from scanners and privacy proxies. They do not establish human engagement or
inbox placement. Brew's final dashboard statistics apply additional filtering.
