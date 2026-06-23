import type { HttpClient } from '../../core/http'

import { createGetAccount } from './get'

export type AccountResource = {
  /** `GET /v1/account` — plan, credit balance, email-send quota, and billing period (scope: `emails`). */
  readonly get: ReturnType<typeof createGetAccount>
}

export function createAccountResource(client: HttpClient): AccountResource {
  return {
    get: createGetAccount(client),
  }
}
