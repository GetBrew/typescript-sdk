import type { components } from '../../generated/openapi-types'

/** Envelope returned by `GET /v1/usage`. */
export type UsageGetResponse = components['schemas']['UsageGetResponse']

/** API usage for the organization (overview + trend + per-route stats). */
export type Usage = UsageGetResponse['usage']

/** Rolling 24h request totals. */
export type UsageOverview = Usage['overview']

/** One daily point in the 30-day request/error trend. */
export type UsageTrendPoint = Usage['trend'][number]

/** Per-route rollup over the last 7 days. */
export type UsageRouteStat = Usage['routes'][number]
