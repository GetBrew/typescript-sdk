import type { HttpClient } from '../../core/http'

import { createCreateField } from './create'
import { createDeleteField } from './delete'
import { createGetField } from './get'
import { createListFields } from './list'

export type FieldsResource = {
  readonly list: ReturnType<typeof createListFields>
  readonly get: ReturnType<typeof createGetField>
  readonly create: ReturnType<typeof createCreateField>
  readonly delete: ReturnType<typeof createDeleteField>
}

export function createFieldsResource(client: HttpClient): FieldsResource {
  return {
    list: createListFields(client),
    get: createGetField(client),
    create: createCreateField(client),
    delete: createDeleteField(client),
  }
}
