import type { HttpClient } from '../../core/http'

import { createGetMe } from './get'

export type MeResource = {
  /** `GET /v1/me` — auth type, org, brand, and granted scopes for the current credential (scope-agnostic). */
  readonly get: ReturnType<typeof createGetMe>
}

export function createMeResource(client: HttpClient): MeResource {
  return {
    get: createGetMe(client),
  }
}
