import type { HttpClient } from '../../core/http'

import { createGetUsage } from './get'

export type UsageResource = {
  /** `GET /v1/usage` — plan, credit balance, email-send quota, and billing period (scope: `emails`). */
  readonly get: ReturnType<typeof createGetUsage>
}

export function createUsageResource(client: HttpClient): UsageResource {
  return {
    get: createGetUsage(client),
  }
}
