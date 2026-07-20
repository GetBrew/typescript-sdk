# `brew.automations`

Create and manage deterministic automation graphs, run test or manual-audience
executions, and inspect their lifecycle. All methods require the `automations`
scope.

| Method                            | HTTP                                                         |
| --------------------------------- | ------------------------------------------------------------ |
| `create`                          | `POST /v1/automations`                                       |
| `list`                            | `GET /v1/automations`                                        |
| `patch` / `publish` / `unpublish` | `PATCH /v1/automations/{automationId}`                       |
| `delete`                          | `DELETE /v1/automations/{automationId}`                      |
| `test`                            | `POST /v1/automations/{automationId}/test`                   |
| [`run`](#manual-audience-runs)    | `POST /v1/automations/{automationId}/run`                    |
| `runs.list`                       | `GET /v1/automations/runs`                                   |
| `audienceRuns.list`               | `GET /v1/automations/audience-runs`                          |
| `audienceRuns.control`            | `POST /v1/automations/audience-runs/{audienceRunId}/control` |

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
