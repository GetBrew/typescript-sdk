import type { HttpClient } from '../../core/http'

import { createGetUsage } from './get'

export type UsageResource = {
  /** `GET /v1/usage` — request volume, success rate, trend, and per-route stats (scope: `emails`). */
  readonly get: ReturnType<typeof createGetUsage>
}

export function createUsageResource(client: HttpClient): UsageResource {
  return {
    get: createGetUsage(client),
  }
}
