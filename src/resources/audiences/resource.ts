import type { HttpClient } from '../../core/http'

import { createListAudiences } from './list'

export type AudiencesResource = {
  readonly list: ReturnType<typeof createListAudiences>
}

export function createAudiencesResource(client: HttpClient): AudiencesResource {
  return {
    list: createListAudiences(client),
  }
}
