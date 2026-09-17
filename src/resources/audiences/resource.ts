import type { HttpClient } from '../../core/http'

import { createCreateAudience } from './create'
import { createDeleteAudience } from './delete'
import { createDuplicateAudience } from './duplicate'
import { createAudienceFromEvents } from './from-events'
import { createGetAudience } from './get'
import { createListAudiences } from './list'
import { createUpdateAudience } from './update'

export type AudiencesResource = {
  /** `GET /v1/audiences` — every saved audience for the brand, paged with `limit` / `cursor` (scope: `audiences`). */
  readonly list: ReturnType<typeof createListAudiences>
  /** `GET /v1/audiences/{audienceId}` — one audience as the bare row; `include: 'count'` recomputes the live member total (scope: `audiences`). */
  readonly get: ReturnType<typeof createGetAudience>
  /** `POST /v1/audiences` — create from a filter set (scope: `audiences`). */
  readonly create: ReturnType<typeof createCreateAudience>
  /** `POST /v1/audiences/from-events` — create a frozen event-cohort snapshot asynchronously. */
  readonly fromEvents: ReturnType<typeof createAudienceFromEvents>
  /** `POST /v1/audiences/{audienceId}/duplicate` — copy a saved segment. */
  readonly duplicate: ReturnType<typeof createDuplicateAudience>
  /** `PATCH /v1/audiences/{audienceId}` — update `name` / `filters` (scope: `audiences`). */
  readonly update: ReturnType<typeof createUpdateAudience>
  /** `DELETE /v1/audiences/{audienceId}` — idempotent remove (scope: `audiences`). */
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
