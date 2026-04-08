import type { HttpClient } from '../../core/http'

import { createCreateField } from './create'
import { createDeleteField } from './delete'
import { createListFields } from './list'

/**
 * The public shape of `brew.fields`. Each method is a thin wrapper over
 * the shared transport and lives in its own file under
 * `resources/fields/` — a new field endpoint is always one new file plus
 * one new line here.
 */
export type FieldsResource = {
  readonly list: ReturnType<typeof createListFields>
  readonly create: ReturnType<typeof createCreateField>
  readonly delete: ReturnType<typeof createDeleteField>
}

/**
 * Wire every field method to a shared http client.
 */
export function createFieldsResource(client: HttpClient): FieldsResource {
  return {
    list: createListFields(client),
    create: createCreateField(client),
    delete: createDeleteField(client),
  }
}
