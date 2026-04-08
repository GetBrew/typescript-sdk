import type { HttpClient } from '../../core/http'

import { createCountContacts } from './count'
import { createDeleteContact } from './delete'
import { createDeleteManyContacts } from './delete-many'
import { createGetContactByEmail } from './get-by-email'
import { createListContacts } from './list'
import { createPatchContact } from './patch'
import { createUpsertContact } from './upsert'
import { createUpsertManyContacts } from './upsert-many'

/**
 * The public shape of `brew.contacts`. Every method is a thin wrapper
 * over the shared transport; each is implemented in its own file under
 * `resources/contacts/` so a new endpoint is always one new file plus
 * one new line here, never a diff inside an existing method.
 */
export type ContactsResource = {
  readonly list: ReturnType<typeof createListContacts>
  readonly count: ReturnType<typeof createCountContacts>
  readonly getByEmail: ReturnType<typeof createGetContactByEmail>
  readonly upsert: ReturnType<typeof createUpsertContact>
  readonly upsertMany: ReturnType<typeof createUpsertManyContacts>
  readonly patch: ReturnType<typeof createPatchContact>
  readonly delete: ReturnType<typeof createDeleteContact>
  readonly deleteMany: ReturnType<typeof createDeleteManyContacts>
}

/**
 * Wire every contact method to a shared http client. The per-method
 * factories close over the client so consumers never have to pass it
 * around themselves.
 */
export function createContactsResource(client: HttpClient): ContactsResource {
  return {
    list: createListContacts(client),
    count: createCountContacts(client),
    getByEmail: createGetContactByEmail(client),
    upsert: createUpsertContact(client),
    upsertMany: createUpsertManyContacts(client),
    patch: createPatchContact(client),
    delete: createDeleteContact(client),
    deleteMany: createDeleteManyContacts(client),
  }
}
