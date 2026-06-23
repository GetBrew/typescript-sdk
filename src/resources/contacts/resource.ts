import type { HttpClient } from '../../core/http'

import { createCountContacts } from './count'
import { createDeleteContact } from './delete'
import { createDeleteManyContacts } from './delete-many'
import { createGetContactByEmail } from './get-by-email'
import { createImportCsvContacts } from './import-csv'
import { createListAllContacts } from './list-all'
import { createListContacts } from './list'
import { createPatchContact } from './patch'
import { createSearchAllContacts } from './search-all'
import { createSearchContacts } from './search'
import { createUpsertContact } from './upsert'
import { createUpsertManyContacts } from './upsert-many'
import { createValidateContacts } from './validate'

/**
 * The public shape of `brew.contacts`. Every method is a thin wrapper
 * over the shared transport; each is implemented in its own file under
 * `resources/contacts/` so a new endpoint is always one new file plus
 * one new line here, never a diff inside an existing method.
 */
export type ContactsResource = {
  /** `GET /v1/contacts` — list contacts (pagination-only) under `{ data, pagination }` (scope: `contacts`). */
  readonly list: ReturnType<typeof createListContacts>
  /** Async-iterate every contact (newest first) by following `list` pagination (scope: `contacts`). */
  readonly listAll: ReturnType<typeof createListAllContacts>
  /** `POST /v1/contacts/search` — structured filter/search/sort over contacts (scope: `contacts`). */
  readonly search: ReturnType<typeof createSearchContacts>
  /** Async-iterate every contact matching a `search` query (scope: `contacts`). */
  readonly searchAll: ReturnType<typeof createSearchAllContacts>
  /** `POST /v1/contacts/search` with `count: true` — count matching contacts (scope: `contacts`). */
  readonly count: ReturnType<typeof createCountContacts>
  /** `GET /v1/contacts/{email}` — fetch one contact by email (scope: `contacts`). */
  readonly getByEmail: ReturnType<typeof createGetContactByEmail>
  readonly upsert: ReturnType<typeof createUpsertContact>
  readonly upsertMany: ReturnType<typeof createUpsertManyContacts>
  /** `PATCH /v1/contacts/{email}` — partially update a contact (scope: `contacts`). */
  readonly patch: ReturnType<typeof createPatchContact>
  /** `DELETE /v1/contacts/{email}` — delete one contact (idempotent) (scope: `contacts`). */
  readonly delete: ReturnType<typeof createDeleteContact>
  /** `POST /v1/contacts/batch-delete` — delete up to 1000 contacts by email (scope: `contacts`). */
  readonly deleteMany: ReturnType<typeof createDeleteManyContacts>
  /** `POST /v1/contacts/validate` — batch-validate emails without creating contacts (scope: `contacts`). */
  readonly validate: ReturnType<typeof createValidateContacts>
  /** `POST /v1/contacts/import-csv` — bulk-import contacts from a raw CSV string (scope: `contacts`). */
  readonly importCsv: ReturnType<typeof createImportCsvContacts>
}

/**
 * Wire every contact method to a shared http client. The per-method
 * factories close over the client so consumers never have to pass it
 * around themselves.
 */
export function createContactsResource(client: HttpClient): ContactsResource {
  return {
    list: createListContacts(client),
    listAll: createListAllContacts(client),
    search: createSearchContacts(client),
    searchAll: createSearchAllContacts(client),
    count: createCountContacts(client),
    getByEmail: createGetContactByEmail(client),
    upsert: createUpsertContact(client),
    upsertMany: createUpsertManyContacts(client),
    patch: createPatchContact(client),
    delete: createDeleteContact(client),
    deleteMany: createDeleteManyContacts(client),
    validate: createValidateContacts(client),
    importCsv: createImportCsvContacts(client),
  }
}
