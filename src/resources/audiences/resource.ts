import type { HttpClient } from '../../core/http'

import { createCreateAudience } from './create'
import { createDeleteAudience } from './delete'
import { createDuplicateAudience } from './duplicate'
import { createAudienceFromEvents } from './from-events'
import { createGetAudience } from './get'
import { createListAudiences } from './list'
import { createUpdateAudience } from './update'

export type AudiencesResource = {
  readonly list: ReturnType<typeof createListAudiences>
  readonly get: ReturnType<typeof createGetAudience>
  readonly create: ReturnType<typeof createCreateAudience>
  readonly fromEvents: ReturnType<typeof createAudienceFromEvents>
  readonly duplicate: ReturnType<typeof createDuplicateAudience>
  readonly update: ReturnType<typeof createUpdateAudience>
  readonly delete: ReturnType<typeof createDeleteAudience>
}

export function createAudiencesResource(client: HttpClient): AudiencesResource {
  return {
    list: createListAudiences(client),
    get: createGetAudience(client),
    create: createCreateAudience(client),
    fromEvents: createAudienceFromEvents(client),
    duplicate: createDuplicateAudience(client),
    update: createUpdateAudience(client),
    delete: createDeleteAudience(client),
  }
}
