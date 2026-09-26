import type { HttpClient } from '../../core/http'

import { createCountContacts } from './count'
import { createCountContactsBy } from './count-by'
import { createDeleteContact } from './delete'
import { createDeleteManyContacts } from './delete-many'
import { createGetContact } from './get'
import { createImportCsvContacts } from './import-csv'
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
 *
 * `list` is the simple read, `get` fetches one by email, and `search`
 * is the structured one (typed `filters` combined by `logic`).
 */
export type ContactsResource = {
  /** `GET /v1/contacts` — the brand's contacts, newest first; free-text `search`, `audienceId` scope, `sort` + `order`, cursor pagination (scope: `contacts`). */
  readonly list: ReturnType<typeof createListContacts>
  /** `GET /v1/contacts/{email}` — one contact as the bare row; `404 CONTACT_NOT_FOUND` when the address has none (scope: `contacts`). */
  readonly get: ReturnType<typeof createGetContact>
  /** `POST /v1/contacts/search` — the structured contacts read: typed `filters` combined by `logic`, optional `audienceId` scope, cursor pagination (scope: `contacts`). */
  readonly search: ReturnType<typeof createSearchContacts>
  /** Async-iterate every contact matching a `search` query (scope: `contacts`). */
  readonly searchAll: ReturnType<typeof createSearchAllContacts>
  /** `POST /v1/contacts/search` with `count: true` — count matching contacts (scope: `contacts`). */
  readonly count: ReturnType<typeof createCountContacts>
  /** `POST /v1/contacts/search` with `count: true` and `groupBy` / `bucket` — exact counts per field value, email domain, or period (scope: `contacts`). */
  readonly countBy: ReturnType<typeof createCountContactsBy>
  /** `POST /v1/contacts` — create or update a single contact by email; pass `validate: true` to deliverability-check and persist the verdict inline at 2 credits per address (scope: `contacts`). */
  readonly upsert: ReturnType<typeof createUpsertContact>
  /** `POST /v1/contacts` — batch create/update contacts; pass `validate: true` to deliverability-check each address (inline ≤100, else a background `validationJobId`) at 2 credits per address (scope: `contacts`). */
  readonly upsertMany: ReturnType<typeof createUpsertManyContacts>
  /** `PATCH /v1/contacts/{email}` — partially update a contact (scope: `contacts`). */
  readonly patch: ReturnType<typeof createPatchContact>
  /** `DELETE /v1/contacts/{email}` — delete one contact (idempotent) (scope: `contacts`). */
  readonly delete: ReturnType<typeof createDeleteContact>
  /** `POST /v1/contacts/batch-delete` — delete up to 1000 contacts by email (scope: `contacts`). */
  readonly deleteMany: ReturnType<typeof createDeleteManyContacts>
  /** `POST /v1/contacts/validate` — batch deliverability check for emails (valid/risky/invalid + `reason` + `didYouMean` + `risk`/`isDisposable`/`isRole`); PERSISTS the verdict onto any matching existing contacts; metered 2 credits per address (scope: `contacts`). */
  readonly validate: ReturnType<typeof createValidateContacts>
  /** `POST /v1/contacts/import-csv` — bulk-import contacts from a raw CSV string; pass `validate: true` to deliverability-check the imported addresses (inline ≤100, else a background `validationJobId`) at 2 credits per address (scope: `contacts`). */
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
    importCsv: createImportCsvContacts(client),
  }
}
