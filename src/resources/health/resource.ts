import type { HttpClient } from '../../core/http'

import { createGetHealth } from './get'

export type HealthResource = {
  readonly get: ReturnType<typeof createGetHealth>
}

export function createHealthResource(client: HttpClient): HealthResource {
  return {
    get: createGetHealth(client),
  }
}
