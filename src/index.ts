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
export type { AudiencesResource } from './resources/audiences/resource'
export type { ContactsResource } from './resources/contacts/resource'
export type { DomainsResource } from './resources/domains/resource'
export type { EmailsResource } from './resources/emails/resource'
export type { FieldsResource } from './resources/fields/resource'
export type { SendsResource } from './resources/sends/resource'
export type { TemplatesResource } from './resources/templates/resource'

// ---------- Audiences: domain types ----------
export type { Audience } from './resources/audiences/types'
export type { Domain } from './resources/domains/types'
export type {
  EmailStatus,
  EmailSummary,
  GeneratedEmailArtifact,
  GeneratedEmailTextResponse,
} from './resources/emails/types'
export type {
  SendAcceptedResponse,
  SendAcceptedStatus,
} from './resources/sends/types'
export type { Template } from './resources/templates/types'

// ---------- Audiences: method inputs + outputs ----------
export type { ListAudiencesResponse } from './resources/audiences/list'
export type { ListDomainsResponse } from './resources/domains/list'
export type {
  GenerateEmailInput,
  GenerateEmailResponse,
} from './resources/emails/generate'
export type {
  ListEmailsInput,
  ListEmailsResponse,
} from './resources/emails/list'
export type {
  CreateSendInput,
  CreateSendResponse,
} from './resources/sends/create'
export type {
  ListTemplatesInput,
  ListTemplatesResponse,
} from './resources/templates/list'

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
export type { ListAllContactsInput } from './resources/contacts/list-all'
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
