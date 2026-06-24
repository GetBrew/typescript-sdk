import type { HttpClient } from '../../core/http'

import { createGetHelp } from './get'

export type HelpResource = {
  /** `GET /v1/help` — the no-auth machine-readable API catalog. */
  readonly get: ReturnType<typeof createGetHelp>
}

export function createHelpResource(client: HttpClient): HelpResource {
  return {
    get: createGetHelp(client),
  }
}
