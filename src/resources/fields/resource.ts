import type { HttpClient } from '../../core/http'

import { createCreateField } from './create'
import { createDeleteField } from './delete'
import { createGetField } from './get'
import { createListFields } from './list'

/**
 * The public shape of `brew.fields`. Each method is a thin wrapper over
 * the shared transport and lives in its own file under
 * `resources/fields/` — a new field endpoint is always one new file plus
 * one new line here.
 */
export type FieldsResource = {
  /** `GET /v1/fields` — every contact field definition; `include: 'coverage'` adds per-field fill rates (scope: `contacts`). */
  readonly list: ReturnType<typeof createListFields>
  /** `GET /v1/fields/{fieldName}` — one field definition as the bare row (scope: `contacts`). */
  readonly get: ReturnType<typeof createGetField>
  /** `POST /v1/fields` — create or update a custom field definition (scope: `contacts`). */
  readonly create: ReturnType<typeof createCreateField>
  /** `DELETE /v1/fields/{fieldName}` — idempotent remove (scope: `contacts`). */
  readonly delete: ReturnType<typeof createDeleteField>
}

/**
 * Wire every field method to a shared http client.
 */
export function createFieldsResource(client: HttpClient): FieldsResource {
  return {
    list: createListFields(client),
    get: createGetField(client),
    create: createCreateField(client),
    delete: createDeleteField(client),
  }
}
