# `brew.insights`

Brew Insights as typed reads: the findings the Insights page ranks, how
current they are, and the intelligence layer beside them. Both methods are
free and read-only.

| Method          | HTTP                           | Scope    |
| --------------- | ------------------------------ | -------- |
| [`list`](#list) | `GET /v1/insights`             | `emails` |
| [`get`](#get)   | `GET /v1/insights/{insightId}` | `emails` |

> **New in 11.6.0.** The typed replacement for reading insights through
> `brew.data.run`, which the API is retiring.

## Shared types

```ts
type InsightSummary = {
  readonly insightId: string
  readonly title: string
  readonly description: string // the detector's headline
  readonly severity: 'critical' | 'warning' | 'opportunity' | 'info'
  readonly confidence: 'high' | 'medium' | 'low'
  readonly kind: 'answer' | 'insight' | 'strategy'
  readonly category: string
  readonly detectorId: string
  readonly state:
    | 'active'
    | 'snoozed'
    | 'cleared'
    | 'dismissed'
    | 'resolved'
    | 'stale'
  readonly firstSeenAt: string // ISO-8601
  readonly lastSeenAt: string
  readonly recurrenceCount: number
  // Open a page in Brew, or start the assistant with a prompt.
  readonly action?:
    | { kind: 'navigate'; label: string; url: string }
    | { kind: 'assistant'; label: string; intent: string; prompt: string }
  readonly url: string // the finding in Brew
}

type InsightFreshness = {
  readonly dataAsOf: string | null // how current the data behind the findings is
  readonly lastSuccessfulRunAt: string | null
  // 'failed' means the findings may be stale.
  readonly latestAttempt: {
    status: 'succeeded' | 'failed' | 'running' | 'unknown'
    at: string
  } | null
}
```

`Insight` (from [`get`](#get)) is `InsightSummary` plus `rationale`,
`closedReason`, `closedAt`, `lastActedAt`, `churnCount`, `metrics`,
`evidence`, `subject`, `method`, `generatedBy` and `freshness`.

---

## `list`

The brand's findings as the Insights page ranks them, most severe first
and then by score, under `{ data, pagination, freshness }`. The engine keeps
at most 200 findings in view.

```ts
type ListInsightsInput = {
  readonly state?: 'open' | 'all' // default 'open'
  readonly severity?: 'critical' | 'warning' | 'opportunity' | 'info'
  readonly include?:
    | ReadonlyArray<'pulse' | 'report' | 'suggestions' | 'memo'>
    | string
  readonly limit?: number // 1–100, default 100
  readonly cursor?: string
}
```

```ts
const { data, freshness } = await brew.insights.list({ severity: 'critical' })

if (freshness.latestAttempt?.status === 'failed') {
  console.warn(`Findings may be stale (data as of ${freshness.dataAsOf}).`)
}
for (const finding of data) {
  console.log(finding.severity, finding.title, finding.url)
}
```

- `state: 'open'` (the default) lists active findings and snoozes that
  have ended. `'all'` adds resolved, cleared, dismissed and stale findings
  and snoozes still in effect.
- `severity` reads one severity, up to 200 of its own however many more
  severe findings exist.

### The intelligence layer (`include`)

`include` adds what the Insights page shows beside the findings, as
top-level keys of the page. Each is `null` until it exists.

| Token           | Key           | What it is                                                     |
| --------------- | ------------- | -------------------------------------------------------------- |
| `'pulse'`       | `pulse`       | The last 7 days against the 7 before (`InsightPulse`)          |
| `'report'`      | `report`      | The latest report the analysis agent published                 |
| `'suggestions'` | `suggestions` | Its proposed and launched suggestions, up to 25                |
| `'memo'`        | `memo`        | The agent's memory across runs (`markdown`, `version`, author) |

```ts
const { pulse, report } = await brew.insights.list({
  include: ['pulse', 'report'],
  limit: 10,
})
console.log(pulse?.openRatePct, pulse?.openDirection)
for (const item of report?.insights ?? []) {
  console.log(item.kind, item.title)
}
```

The expansions belong to the page, not the rows, so every page that asks
for them recomputes them. Ask on the first page only.

### Errors

- **`400 INVALID_REQUEST`**: an unknown query value or `include` token, or
  a malformed `cursor`.

---

## `get`

One finding in full, as its page in Brew reads it. Use it to explain why a
finding exists or what would resolve it.

```ts
const insight = await brew.insights.get('k17a8m2v4w5x6y7z8a9b0c1d2e3f4g5h')

console.log(insight.rationale)
console.log(insight.method?.resolvesWhen)
for (const [name, metric] of Object.entries(insight.metrics)) {
  if (metric.kind === 'rate') {
    console.log(name, metric.value, `${metric.numerator}/${metric.denominator}`)
  }
}
```

`metrics` were frozen when the finding was computed, and are the only
numbers to quote about it. Each is a tagged `InsightMetric` (`count`,
`rate`, `share`, `duration`, `delta`, `hourOfDay`, `multiple`, `rank`,
`interval` or `label`). `method` says what the detector measures, how,
against what, and what resolves it. `generatedBy` names the engine run that
produced the finding and its `blindSpots`.

### Errors

- **`404 INSIGHT_NOT_FOUND`**: an unknown, malformed or over-long id, OR a
  finding of another brand. All of these get the same error, so you cannot
  tell them apart.

Pass `{ raw: true }` in `options` on either method to receive the full
`BrewRawResponse<T>` (status, headers, request id) instead of the
unwrapped payload.
