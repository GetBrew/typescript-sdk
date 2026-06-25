import type { HttpClient } from '../../core/http'

import { createGetHealth } from './get'

export type HealthResource = {
  /** `GET /v1/health` — the no-auth liveness probe (`{ status, version }`). */
  readonly get: ReturnType<typeof createGetHealth>
}

export function createHealthResource(client: HttpClient): HealthResource {
  return {
    get: createGetHealth(client),
  }
}
