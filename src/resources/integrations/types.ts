import type { components } from '../../generated/openapi-types'

/**
 * Envelope returned by `GET /v1/integrations` — the full provider
 * catalog for the brand in scope, `{ data }` (unpaginated).
 */
export type IntegrationsListResponse =
  components['schemas']['IntegrationsListResponse']

/**
 * One row of the integration catalog: a `provider`, its display `name`,
 * `category` (`data_in` | `data_out`), whether the brand has it
 * `connected`, and an optional `comingSoon` flag for providers not yet
 * live. Connecting a provider is a human Settings hop at
 * `/integrations/{provider}` — never construct or paste a connect URL.
 */
export type Integration = IntegrationsListResponse['data'][number]
