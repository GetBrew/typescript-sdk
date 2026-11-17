import type { operations } from '../../generated/openapi-types'

/**
 * Domain types for `brew.insights.*` (`GET /v1/insights`,
 * `GET /v1/insights/{insightId}`).
 *
 * Every type is derived from the generated OPERATION, not a named
 * component: the response schemas are inline today and may be split into
 * named components later, and reading them through `operations[...]` keeps
 * these aliases stable through such a rename.
 */

/**
 * The page `GET /v1/insights` returns: `{ data, pagination, freshness }`
 * plus `pulse`, `report`, `suggestions` and `memo` when `include` asks for
 * them. `pulse`, `report` and `memo` are `null` until they exist;
 * `suggestions` is an empty array.
 */
export type InsightsListResponse =
  operations['listInsights']['responses'][200]['content']['application/json']

/**
 * One finding of the insight engine as `GET /v1/insights` lists it:
 * `insightId`, `title`, `description` (the detector's headline),
 * `severity`, `confidence`, `kind`, `category`, `detectorId`, `state`,
 * `firstSeenAt`, `lastSeenAt`, `recurrenceCount`, an optional `action`
 * and the finding's `url` in Brew.
 */
export type InsightSummary = InsightsListResponse['data'][number]

/**
 * One finding in full, as `GET /v1/insights/{insightId}` returns it: the
 * list row's fields plus `rationale`, `closedReason`, `closedAt`,
 * `lastActedAt`, `churnCount`, the frozen `metrics`, `evidence` links, its
 * `subject`, the detector's `method`, `generatedBy` and `freshness`.
 */
export type Insight =
  operations['getInsight']['responses'][200]['content']['application/json']

/** `critical` | `warning` | `opportunity` | `info`. */
export type InsightSeverity = InsightSummary['severity']

/** `active` | `snoozed` | `cleared` | `dismissed` | `resolved` | `stale`. */
export type InsightState = InsightSummary['state']

/**
 * What the Insights page offers to do about a finding: open a page in Brew
 * (`kind: 'navigate'`, with its `url`) or start the assistant
 * (`kind: 'assistant'`, with an `intent` and a `prompt`).
 */
export type InsightAction = NonNullable<InsightSummary['action']>

/**
 * How current the findings are, on every list page and every finding:
 * `dataAsOf` (the data behind them), `lastSuccessfulRunAt`, and
 * `latestAttempt` (`status: 'failed'` means they may be stale).
 */
export type InsightFreshness = InsightsListResponse['freshness']

/**
 * One of a finding's frozen `metrics`, keyed by name: a `count`, `rate`,
 * `share`, `duration`, `delta`, `hourOfDay`, `multiple`, `rank`,
 * `interval` or `label`. Frozen when the finding was computed — the only
 * numbers to quote about it.
 */
export type InsightMetric = Insight['metrics'][string]

/**
 * `include: 'pulse'` — the last 7 days against the 7 before (deliveries,
 * unique opens and clicks, unsubscribes, rates and directions).
 */
export type InsightPulse = NonNullable<InsightsListResponse['pulse']>

/** `include: 'report'` — the latest report the analysis agent published. */
export type InsightReport = NonNullable<InsightsListResponse['report']>

/**
 * One of `include: 'suggestions'` — the analysis agent's proposed and
 * launched suggestions (up to 25).
 */
export type InsightSuggestion = NonNullable<
  InsightsListResponse['suggestions']
>[number]

/** `include: 'memo'` — the analysis agent's memory across runs. */
export type InsightMemo = NonNullable<InsightsListResponse['memo']>

/** The generated query `GET /v1/insights` takes. */
export type ListInsightsQuery = NonNullable<
  operations['listInsights']['parameters']['query']
>
