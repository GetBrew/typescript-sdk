import type { components } from '../../generated/openapi-types'

/**
 * The machine-readable API catalog returned by `GET /v1/help`. The spec
 * types this as a generic JSON object — read the live response for the
 * concrete shape (auth, scopes, rate limits, flat credit costs, the
 * error envelope, and the full endpoint list).
 */
export type HelpResponse = components['schemas']['HelpResponse']
