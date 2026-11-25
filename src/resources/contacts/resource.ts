import type { HttpClient } from '../../core/http'

import { createCountContacts } from './count'
import { createCountContactsBy } from './count-by'
import { createDeleteContact } from './delete'
import { createDeleteManyContacts } from './delete-many'
import { createGetContact } from './get'
import { createImportContacts } from './import'
import { createImportCsvContacts } from './import-csv'
import { createListContacts } from './list'
import { createPatchContact } from './patch'
import { createSearchAllContacts } from './search-all'
import { createSearchContacts } from './search'
import { createUpsertContact } from './upsert'
import { createUpsertManyContacts } from './upsert-many'
import { createValidateContacts } from './validate'

export type ContactsResource = {
  readonly list: ReturnType<typeof createListContacts>
  readonly get: ReturnType<typeof createGetContact>
  readonly search: ReturnType<typeof createSearchContacts>
  readonly searchAll: ReturnType<typeof createSearchAllContacts>
  readonly count: ReturnType<typeof createCountContacts>
  readonly countBy: ReturnType<typeof createCountContactsBy>
  readonly upsert: ReturnType<typeof createUpsertContact>
  readonly upsertMany: ReturnType<typeof createUpsertManyContacts>
  readonly patch: ReturnType<typeof createPatchContact>
  readonly delete: ReturnType<typeof createDeleteContact>
  readonly deleteMany: ReturnType<typeof createDeleteManyContacts>
  readonly validate: ReturnType<typeof createValidateContacts>
  readonly import: ReturnType<typeof createImportContacts>
  readonly importCsv: ReturnType<typeof createImportCsvContacts>
}

export function createContactsResource(client: HttpClient): ContactsResource {
  return {
    list: createListContacts(client),
    get: createGetContact(client),
    search: createSearchContacts(client),
    searchAll: createSearchAllContacts(client),
    count: createCountContacts(client),
    countBy: createCountContactsBy(client),
    upsert: createUpsertContact(client),
    upsertMany: createUpsertManyContacts(client),
    patch: createPatchContact(client),
    delete: createDeleteContact(client),
    deleteMany: createDeleteManyContacts(client),
    validate: createValidateContacts(client),
    import: createImportContacts(client),
    importCsv: createImportCsvContacts(client),
  }
}
