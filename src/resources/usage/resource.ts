import type { HttpClient } from '../../core/http'

import { createGetUsage } from './get'

export type UsageResource = {
  readonly get: ReturnType<typeof createGetUsage>
}

export function createUsageResource(client: HttpClient): UsageResource {
  return {
    get: createGetUsage(client),
  }
}
