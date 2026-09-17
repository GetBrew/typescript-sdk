# `brew.automations`

Create and manage deterministic automation graphs, run test or manual-audience
executions, and inspect their lifecycle. All methods require the `automations`
scope.

| Method                                                     | HTTP                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------ |
| `create`                                                   | `POST /v1/automations`                                       |
| `list`                                                     | `GET /v1/automations`                                        |
| `patch` / `publish` / `unpublish`                          | `PATCH /v1/automations/{automationId}`                       |
| `delete`                                                   | `DELETE /v1/automations/{automationId}`                      |
| `test`                                                     | `POST /v1/automations/{automationId}/test`                   |
| [`run`](#manual-audience-runs)                             | `POST /v1/automations/{automationId}/run`                    |
| `runs.list`                                                | `GET /v1/automations/runs`                                   |
| [`runs.cancel`](#cancel-a-run)                             | `PATCH /v1/automations/runs`                                 |
| `audienceRuns.list`                                        | `GET /v1/automations/audience-runs`                          |
| `audienceRuns.control`                                     | `POST /v1/automations/audience-runs/{audienceRunId}/control` |
| `triggers.list` / `create` / `patch` / `delete`            | `/v1/automations/triggers[/{triggerEventId}]`                |
| [`triggers.fire`](#transactional-email--firing-triggers)   | `POST /v1/automations/triggers/{triggerEventId}/fire`        |
| `triggers.ready`                                           | `GET /v1/automations/triggers/{triggerEventId}/fire`         |
| `triggers.getContract` / `putContract` / `validatePayload` | `/v1/automations/triggers/{triggerEventId}/contract[…]`      |

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

console.log(result.details?.automationRunIds) // one run per published automation
```

Payloads support arbitrarily nested JSON; the email reads them as
`{{ trigger.* }}` variables. Retries with the same `idempotencyKey`
replay the original run ids instead of firing duplicates. Firing a
trigger with zero published automations returns `422
NO_PUBLISHED_AUTOMATION`. Use `triggers.ready` for a no-op pre-flight
and `triggers.getContract` / `validatePayload` for the typed payload
contract.

## Manual-audience runs

`run` previews, launches, or schedules an automation whose trigger is bound to
a saved audience. `dry_run: true` returns recipient and send-node counts without
starting delivery. Live calls return an `audienceRunId`; use the nested resource
to inspect, pause, resume, or permanently cancel it.

```ts
const preview = await brew.automations.run({
  automationId: 'auto_abc',
  dry_run: true,
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
  const { data } = await brew.automations.audienceRuns.list({
    audienceRunId: started.audienceRunId,
  })
  console.log(data[0]?.status)

  await brew.automations.audienceRuns.control({
    audienceRunId: started.audienceRunId,
    action: 'pause',
  })
}
```

`cancel` is permanent; already-sent messages cannot be recalled. Invalid state
transitions return `409`, and unknown or cross-brand ids return `404`.

## Cancel a run

`runs.cancel` is the operator cancel for ONE run of an event-triggered
automation (or a test run), by `automationRunId` — the same flat identity
`runs.list` uses. The method fills in the only PATCH action (`status:
'canceled'`); pass the id and an optional operator note.

```ts
type CancelAutomationRunInput = {
  readonly automationRunId: string
  readonly reason?: string // stored on the run
}

type AutomationRunCancelResponse = {
  readonly automationRunId: string
  readonly status: 'canceled'
  readonly previousStatus: 'pending' | 'running' | 'completed' | 'failed' | 'canceled'
}

runs.cancel(input: CancelAutomationRunInput): Promise<AutomationRunCancelResponse>
```

```ts
const { previousStatus } = await brew.automations.runs.cancel({
  automationRunId: 'run_abc',
  reason: 'wrong audience',
})
```

Marks the run `canceled` (first-terminal-wins), wakes a run parked on a wait
node so it observes the cancel now, and terminates the durable workflow run.
Nothing further is sent; delivered emails are not recalled and a canceled run
cannot be resumed. `409 RUN_NOT_CANCELLABLE` once the run already finished;
`404 AUTOMATION_RUN_NOT_FOUND` for an unknown or cross-brand id. Manual-audience
launches use `audienceRuns.control` instead.
