# Marketing goals

`brew.agentGoals` reads and manages the current brand's ongoing marketing goals.
Goals continue independently of the client connection. Creating a goal does not
create standing permission to send. API-key creation produces a paused goal;
activation and grant management require an authorized person in Brew.

```ts
const brew = createBrewClient({ apiKey, brandId })
const page = await brew.agentGoals.list({ limit: 20 })
const detail = await brew.agentGoals.get(page.data[0].goalId)

await brew.agentGoals.followUp(
  {
    goalId: detail.goal.goalId,
    message: 'Review campaign results',
    sourceId: 'send_123:day-one-review',
    dueAt: Date.now() + 86_400_000,
  },
  { idempotencyKey: 'send_123:day-one-review' }
)
```

With verified human authorization, use `update({ goalId, status })` to pause,
activate, or cancel a goal. Organization API keys cannot activate goals. Current
permissions are checked on the server, including after long waits. An API key
cannot approve its own standing grant.

`tasks({ goalId, limit, cursor })` reads execution progress, while
`documents({ goalId, limit, cursor })` reads published workspace documents,
including their content, with a maximum page size of 25. Goal detail returns
file metadata only; use the documents method to load content.
These list methods return the standard `{ data, pagination }` envelope.

Publish a revision with `publishDocument({ goalId, path, expectedRevision,
content, source? })`. Use revision `0` for a new document. If another writer
changed the document, reload it and reconcile the conflict before publishing;
do not silently replace the expected revision.

All methods accept `RequestOptions`, including cancellation, timeouts,
`idempotencyKey` for writes, and `{ raw: true }` for response metadata. Keep a
stable occurrence identifier and idempotency key when resuming work after a
network failure.
