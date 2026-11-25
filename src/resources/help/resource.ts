import type { HttpClient } from '../../core/http'

import { createGetHelp } from './get'

export type HelpResource = {
  readonly get: ReturnType<typeof createGetHelp>
}

export function createHelpResource(client: HttpClient): HelpResource {
  return {
    get: createGetHelp(client),
  }
}
