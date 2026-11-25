import type { operations } from '../../generated/openapi-types'

export type InsightsListResponse =
  operations['listInsights']['responses'][200]['content']['application/json']

export type InsightSummary = InsightsListResponse['data'][number]

export type Insight =
  operations['getInsight']['responses'][200]['content']['application/json']

export type InsightSeverity = InsightSummary['severity']

export type InsightState = InsightSummary['state']

export type InsightAction = NonNullable<InsightSummary['action']>

export type InsightFreshness = InsightsListResponse['freshness']

export type InsightMetric = Insight['metrics'][string]

export type InsightPulse = NonNullable<InsightsListResponse['pulse']>

export type InsightReport = NonNullable<InsightsListResponse['report']>

export type InsightSuggestion = NonNullable<
  InsightsListResponse['suggestions']
>[number]

export type InsightMemo = NonNullable<InsightsListResponse['memo']>

export type ListInsightsQuery = NonNullable<
  operations['listInsights']['parameters']['query']
>
