import type { HttpClient } from '../../core/http'

import { createCreateAudience, createDuplicateAudience } from './create'
import { createDeleteAudience } from './delete'
import { createGetAudience } from './get'
import { createListAudiences } from './list'
import { createUpdateAudience } from './update'

export type AudiencesResource = {
  /** `GET /v1/audiences` — list saved audiences ({ data, pagination }) (scope: `audiences`). */
  readonly list: ReturnType<typeof createListAudiences>
  /** `GET /v1/audiences/{audienceId}` — single audience row; pass `include: 'count'` for the live member total (scope: `audiences`). */
  readonly get: ReturnType<typeof createGetAudience>
  /** `POST /v1/audiences` — create from a filter set (scope: `audiences`). */
  readonly create: ReturnType<typeof createCreateAudience>
  /** `POST /v1/audiences/{audienceId}/duplicate` — clone an existing audience (scope: `audiences`). */
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
    duplicate: createDuplicateAudience(client),
    update: createUpdateAudience(client),
    delete: createDeleteAudience(client),
  }
}
