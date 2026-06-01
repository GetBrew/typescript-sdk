import type { HttpClient } from '../../core/http'

import { createCreateAudience, createDuplicateAudience } from './create'
import { createDeleteAudience } from './delete'
import { createGetAudience } from './get'
import { createListAudiences } from './list'
import { createUpdateAudience } from './update'

export type AudiencesResource = {
  /** `GET /v1/audiences` — list saved audiences for the brand. */
  readonly list: ReturnType<typeof createListAudiences>
  /** `GET /v1/audiences?audienceId=…` — single audience (one-element envelope). */
  readonly get: ReturnType<typeof createGetAudience>
  /** `POST /v1/audiences` — create from a filter set. */
  readonly create: ReturnType<typeof createCreateAudience>
  /** `POST /v1/audiences { duplicateFrom }` — clone an existing audience. */
  readonly duplicate: ReturnType<typeof createDuplicateAudience>
  /** `PATCH /v1/audiences` — update `name` / `filters`. */
  readonly update: ReturnType<typeof createUpdateAudience>
  /** `DELETE /v1/audiences` — idempotent remove. */
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
