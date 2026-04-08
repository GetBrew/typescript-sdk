/**
 * @brew.new/sdk — Official TypeScript SDK for the Brew public API.
 *
 * This is the only file consumers should import from. Anything not
 * re-exported here is private and may change without a major version
 * bump.
 */

// ---------- Client ----------
export { createBrewClient, type BrewClient } from './client'

// ---------- Errors ----------
export { BrewApiError } from './core/errors'

// ---------- Public config + request types ----------
export type {
  BrewClientConfig,
  BrewErrorEnvelope,
  BrewErrorType,
  BrewFetch,
  BrewHttpMethod,
  BrewRawResponse,
  RequestOptions,
} from './types'

// ---------- Resource shapes ----------
export type { ContactsResource } from './resources/contacts/resource'
export type { FieldsResource } from './resources/fields/resource'

// ---------- Contacts: domain types ----------
export type {
  Contact,
  ContactCustomFields,
  ContactsFilter,
} from './resources/contacts/types'

// ---------- Contacts: method inputs + outputs ----------
export type {
  ListContactsInput,
  ListContactsResponse,
} from './resources/contacts/list'
export type { CountContactsInput } from './resources/contacts/count'
export type { GetContactByEmailInput } from './resources/contacts/get-by-email'
export type {
  UpsertContactInput,
  UpsertContactResponse,
} from './resources/contacts/upsert'
export type {
  UpsertManyContactRow,
  UpsertManyContactsInput,
  UpsertManyContactsResponse,
} from './resources/contacts/upsert-many'
export type {
  PatchContactInput,
  PatchContactResponse,
} from './resources/contacts/patch'
export type {
  DeleteContactInput,
  DeleteContactsResponse,
} from './resources/contacts/delete'
export type { DeleteManyContactsInput } from './resources/contacts/delete-many'

// ---------- Fields: domain types ----------
export type {
  ContactField,
  ContactFieldType,
  FieldsSuccessResponse,
} from './resources/fields/types'

// ---------- Fields: method inputs + outputs ----------
export type { ListFieldsResponse } from './resources/fields/list'
export type { CreateFieldInput } from './resources/fields/create'
export type { DeleteFieldInput } from './resources/fields/delete'

// ---------- Metadata ----------
export { SDK_NAME, SDK_VERSION } from './version'
