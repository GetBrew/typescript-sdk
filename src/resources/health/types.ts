import type { components } from '../../generated/openapi-types'

/**
 * The liveness payload returned by `GET /v1/health` — `{ status, version }`.
 * No auth, no rate limit: a public probe a dependent service (e.g. an MCP
 * server) can poll to confirm the API is up.
 */
export type HealthResponse = components['schemas']['HealthResponse']
