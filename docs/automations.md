# `brew.automations`

Create and manage deterministic automation graphs, run test or manual-audience
executions, and inspect their lifecycle. All methods require the `automations`
scope.

| Method                                                     | HTTP                                                      |
| ---------------------------------------------------------- | --------------------------------------------------------- |
| `create`                                                   | `POST /v1/automations`                                    |
| `list`                                                     | `GET /v1/automations`                                     |
| `get`                                                      | `GET /v1/automations/{automationId}`                      |
| `patch` / `publish` / `unpublish`                          | `PATCH /v1/automations/{automationId}`                    |
| `delete`                                                   | `DELETE /v1/automations/{automationId}`                   |
| `test`                                                     | `POST /v1/automations/{automationId}/test`                |
| [`run`](#manual-audience-runs)                             | `POST /v1/automations/{automationId}/run`                 |
| `runs.list`                                                | `GET /v1/automations/runs`                                |
| `runs.get`                                                 | `GET /v1/automations/runs/{automationRunId}`              |
| [`runs.cancel`](#cancel-a-run)                             | `POST /v1/automations/runs/{automationRunId}/cancel`      |
| `audienceRuns.list`                                        | `GET /v1/automations/audience-runs`                       |
| `audienceRuns.get`                                         | `GET /v1/automations/audience-runs/{audienceRunId}`       |
| `audienceRuns.pause` / `resume` / `cancel`                 | `POST …/audience-runs/{audienceRunId}/{action}`           |
| [`triggerInstances.list` / `get`](#fired-trigger-history)  | `/v1/automations/trigger-instances[/{triggerInstanceId}]` |
| `triggers.list` / `create` / `patch` / `delete`            | `/v1/automations/triggers[/{triggerEventId}]`             |
| `triggers.get`                                             | `GET /v1/automations/triggers/{triggerEventId}`           |
| [`triggers.fire`](#transactional-email--firing-triggers)   | `POST /v1/automations/triggers/{triggerEventId}/fire`     |
| `triggers.readiness`                                       | `GET /v1/automations/triggers/{triggerEventId}/readiness` |
| `triggers.getContract` / `putContract` / `validatePayload` | `/v1/automations/triggers/{triggerEventId}/contract[…]`   |

> **Changed in 10.0.0.** Detail reads are real routes now — `get` on every
> collection returns the bare row and `404`s on an unknown id, instead of a
> single-row page. `triggers.ready` became `triggers.readiness` on its own
> route with a bare body; `runs.cancel` takes the id on the URL instead of a
> `status` body verb; `audienceRuns.control({ action })` split into `pause`,
> `resume`, and `cancel`; and `analytics.triggerInstances.*` moved here.

## Reading one automation

```ts
// Lean list — no graph on the rows.
const { data } = await brew.automations.list({ limit: 50 })

// Find one by name: full-text, best match first instead of newest first.
const { data: matches } = await brew.automations.list({ search: 'welcome' })

// The bare row, with the graph and the version history attached.
const automation = await brew.automations.get('auto_abc', {
  include: ['graph', 'versions'],
})
console.log(automation.nodes?.length, automation.versions?.[0]?.version)
```

An unknown or cross-brand id is `404 AUTOMATION_NOT_FOUND`. The
`automationId` query filter on `GET /v1/automations` is gone.

## Transactional email — firing triggers

There is no separate transactional email object. A transactional email
(receipt, password reset, order confirmation, …) is an automation with a
trigger whose `sendEmail` node sends from a domain with
`sendingPurpose: 'transactional'` — that domain choice removes the
unsubscribe requirement and delivers to unsubscribed contacts. Set one up
once (trigger + automation + transactional-purpose `domainId`, then
publish), and fire it per event:

```ts
type OrderCompletedPayload = {
  email: string
  orderId: string
  total: number
  items?: Array<{ sku: string; qty: number }>
}

const result = await brew.automations.triggers.fire<OrderCompletedPayload>(
  {
    triggerEventId: 'tri_8fK2mQ4pLx',
    payload: {
      email: 'customer@acme.com',
      orderId: 'ord_1042',
      total: 42.5,
      items: [{ sku: 'HOP-01', qty: 2 }],
    },
  },
  { idempotencyKey: 'ord_1042' }
)

console.log(result.automationRunIds) // one run per published automation
console.log(result.triggerInstanceId)
```

The fire body is **bare** in 10.0.0 — `{ triggerInstanceId, triggerEventId,
status, automationRunIds, publishedAutomations, counts, warnings,
receivedAt }`. The old `{ success, code, message, details }` envelope, and the
`details.automationRunIds` nesting with it, are gone.

Payloads support arbitrarily nested JSON; the email reads them as
`{{ trigger.* }}` variables. Retries with the same `idempotencyKey` replay the
original run ids instead of firing duplicates (the response says
`status: 'replayed'`). Firing a trigger with zero published automations
returns `422 NO_PUBLISHED_AUTOMATION`.

### Pre-flight with `readiness`

```ts
const readiness = await brew.automations.triggers.readiness('tri_8fK2mQ4pLx')

if (!readiness.ready) {
  // e.g. [{ code: 'NO_PUBLISHED_AUTOMATION', message: '…' }]
  console.log(readiness.blockers)
}
```

`readiness` is its own route (`GET …/readiness`) answering the bare readiness
body. It replaced `triggers.ready`, which overloaded `GET …/fire` and wrapped
its answer in the fire envelope.

## Fired-trigger history

`triggerInstances` is the audit log of every inbound fire — one row per fire,
linking it to the automations it matched and the runs it started. It moved off
`analytics` in 10.0.0 because it is trigger history, not a report.

```ts
const { data } = await brew.automations.triggerInstances.list({
  triggerEventId: 'tri_8fK2mQ4pLx',
})

const instance = await brew.automations.triggerInstances.get('tin_123')

// `state`: received | verified | matched | partially_fired | fired |
// rejected | dead_letter. Branch on it rather than on automationRunIds:
// `fired` means every matched automation started, `partially_fired`
// means some starts are still being retried.
if (instance.state === 'rejected') console.log(instance.rejectionReason)

for await (const row of brew.automations.triggerInstances.listAll()) {
  console.log(row.triggerInstanceId, row.state)
}
```

An unknown id is `404 TRIGGER_INSTANCE_NOT_FOUND` — the code that replaced
`EVENT_NOT_FOUND`.

## Manual-audience runs

`run` previews, launches, or schedules an automation whose trigger is bound to
a saved audience. `dryRun: true` returns recipient and send-node counts without
starting delivery. Live calls return an `audienceRunId`; use the nested resource
to inspect, pause, resume, or permanently cancel it.

```ts
const preview = await brew.automations.run({
  automationId: 'auto_abc',
  dryRun: true, // was `dry_run`
})

const started = await brew.automations.run(
  {
    automationId: 'auto_abc',
    scheduledAt: '2026-07-21T15:00:00.000Z',
    gradualSend: {
      startingPercentage: 10,
      incrementPercentage: 15,
      interval: { value: 1, unit: 'day' },
      timeZone: 'America/New_York',
    },
  },
  { idempotencyKey: 'auto-abc-2026-07-21' }
)

if ('audienceRunId' in started) {
  const run = await brew.automations.audienceRuns.get(started.audienceRunId)
  console.log(run.status, run.sentCount, run.totalRecipients)

  await brew.automations.audienceRuns.pause(started.audienceRunId)
  await brew.automations.audienceRuns.resume(started.audienceRunId)
}
```

The three lifecycle actions are their own sub-paths — `pause`, `resume`, and
`cancel` each POST to `…/audience-runs/{audienceRunId}/{action}` with no body.
`control({ action })` is gone.

`cancel` is permanent; already-sent messages cannot be recalled. Invalid state
transitions return `409` (`RUN_NOT_PAUSABLE` / `RUN_NOT_RESUMABLE` /
`RUN_NOT_CANCELLABLE`), an exhausted quota on resume returns
`402 SEND_QUOTA_EXCEEDED`, and unknown or cross-brand ids return
`404 AUDIENCE_RUN_NOT_FOUND`. A `run` call names the missing entity precisely:
`404 AUTOMATION_NOT_FOUND` or `404 AUDIENCE_NOT_FOUND`, never a generic
`NOT_FOUND`.

Audience runs report the one v1 status vocabulary: `queued | scheduled |
running | paused | completed | failed | canceled`.

## Cancel a run

`runs.cancel` is the operator cancel for ONE run of an event-triggered
automation (or a test run). The id rides the URL; the only body field is an
optional operator note.

```ts
type CancelAutomationRunOptions = RequestOptions & {
  readonly reason?: string // stored on the run
}

type AutomationRunCancelResponse = {
  readonly automationRunId: string
  readonly status: 'canceled'
  readonly previousStatus:
    | 'queued'
    | 'running'
    | 'completed'
    | 'failed'
    | 'canceled'
}

runs.cancel(
  automationRunId: string,
  options?: CancelAutomationRunOptions
): Promise<AutomationRunCancelResponse>
```

```ts
const { previousStatus } = await brew.automations.runs.cancel('run_abc', {
  reason: 'wrong audience',
})
```

Marks the run `canceled` (first-terminal-wins), wakes a run parked on a wait
node so it observes the cancel now, and terminates the durable workflow run.
Nothing further is sent; delivered emails are not recalled and a canceled run
cannot be resumed. `409 RUN_NOT_CANCELLABLE` once the run already finished;
`404 AUTOMATION_RUN_NOT_FOUND` for an unknown or cross-brand id.
Manual-audience launches use `audienceRuns.cancel(audienceRunId)` instead.

## Reading one run

```ts
const run = await brew.automations.runs.get('run_abc', { include: 'logs' })

for (const log of run.logs ?? []) {
  // A node reports: running | completed | failed | skipped.
  console.log(log.nodeName, log.status, log.durationMs)
}
```

## Unpublishing

```ts
// In-flight contacts drain to completion by default.
await brew.automations.unpublish({ automationId: 'auto_abc' })

// Or stop them where they stand (was `stop_in_flight`).
await brew.automations.unpublish({
  automationId: 'auto_abc',
  stopInFlight: true,
})
```

A publish whose graph fails validation returns
`422 PUBLISH_VALIDATION_FAILED` (it was `409` before 10.0.0).
