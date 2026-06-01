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
export type { AnalyticsResource } from './resources/analytics/resource'
export type { AudiencesResource } from './resources/audiences/resource'
export type { AutomationsResource } from './resources/automations/resource'
export type { ContactsResource } from './resources/contacts/resource'
export type { DomainsResource } from './resources/domains/resource'
export type { EmailsResource } from './resources/emails/resource'
export type { AutomationRunsResource } from './resources/automation-runs/resource'
export type { EventsResource } from './resources/events/resource'
export type { FieldsResource } from './resources/fields/resource'
export type { SendsResource } from './resources/sends/resource'
export type { TemplatesResource } from './resources/templates/resource'
export type { TriggersResource } from './resources/triggers/resource'

// ---------- Triggers: domain types ----------
export type { Trigger, TriggersListResponse } from './resources/triggers/types'
export type {
  CreateTriggerInput,
  CreateTriggerResponse,
} from './resources/triggers/create'
export type {
  GetTriggerInput,
  GetTriggerResponse,
  ListTriggersResponse,
} from './resources/triggers/list'
export type {
  PatchTriggerInput,
  PatchTriggerResponse,
} from './resources/triggers/patch'
export type {
  DeleteTriggerInput,
  DeleteTriggerResponse,
} from './resources/triggers/delete'

// ---------- Automations: domain types ----------
export type {
  Automation,
  AutomationsListResponse,
} from './resources/automations/types'
export type {
  CreateAutomationInput,
  CreateAutomationResponse,
  AutomationNodeInput,
  AutomationConnectionInput,
  AutomationTriggerNodeConfig,
  AutomationSendEmailNodeConfig,
  AutomationWaitNodeConfig,
  AutomationFilterNodeConfig,
  AutomationFilterCondition,
  AutomationSplitNodeConfig,
} from './resources/automations/create'
export type {
  GetAutomationInput,
  GetAutomationResponse,
  ListAutomationsResponse,
} from './resources/automations/list'
export type {
  PatchAutomationInput,
  PatchAutomationResponse,
} from './resources/automations/patch'
export type {
  DeleteAutomationInput,
  DeleteAutomationResponse,
} from './resources/automations/delete'

// ---------- Automation runs: domain types ----------
export type {
  AutomationRun,
  AutomationRunLog,
  AutomationRunsListResponse,
  AutomationRunsPostResponse,
  FireTriggerResponse,
  TestRunResponse,
} from './resources/automation-runs/types'
export type {
  AutomationRunsPostInput,
  FireTriggerInput,
  TestAutomationInput,
  ReplayAutomationRunInput,
} from './resources/automation-runs/create'
export type {
  ListAutomationRunsInput,
  ListAutomationRunsResponse,
  GetAutomationRunInput,
  GetAutomationRunResponse,
} from './resources/automation-runs/list'
export type {
  CancelAutomationRunInput,
  CancelAutomationRunResponse,
} from './resources/automation-runs/cancel'

// ---------- Analytics: domain types + method outputs ----------
export type {
  CampaignAnalyticsResponse,
  CampaignAnalyticsRow,
  AutomationAnalyticsResponse,
  AutomationAnalyticsRow,
} from './resources/analytics/types'
export type { AutomationAnalyticsInput } from './resources/analytics/automations'

// ---------- Audiences: domain types ----------
export type { Audience } from './resources/audiences/types'
export type { Domain } from './resources/domains/types'
export type {
  EmailStatus,
  EmailSummary,
  EmailType,
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
export type {
  CreateAudienceInput,
  CreateAudienceResponse,
  DuplicateAudienceInput,
} from './resources/audiences/create'
export type {
  UpdateAudienceInput,
  UpdateAudienceResponse,
} from './resources/audiences/update'
export type {
  DeleteAudienceInput,
  DeleteAudienceResponse,
} from './resources/audiences/delete'
export type {
  GetAudienceInput,
  GetAudienceResponse,
} from './resources/audiences/get'

// ---------- Domains: method inputs + outputs ----------
export type { ListDomainsResponse } from './resources/domains/list'
export type { GetDomainInput, GetDomainResponse } from './resources/domains/get'
export type { AddDomainInput, AddDomainResponse } from './resources/domains/add'
export type {
  VerifyDomainInput,
  VerifyDomainResponse,
} from './resources/domains/verify'
export type {
  UpdateDomainSettingsInput,
  UpdateDomainSettingsResponse,
} from './resources/domains/settings'
export type {
  DeleteDomainInput,
  DeleteDomainResponse,
} from './resources/domains/delete'
export { GENERATE_EMAIL_DEFAULT_TIMEOUT_MS } from './resources/emails/generate'
export type {
  GenerateEmailInput,
  GenerateEmailResponse,
} from './resources/emails/generate'
export { EDIT_EMAIL_DEFAULT_TIMEOUT_MS } from './resources/emails/edit'
export type { EditEmailInput, EditEmailResponse } from './resources/emails/edit'
export type {
  ListEmailsInput,
  ListEmailsResponse,
} from './resources/emails/list'
export type { EmailVersion } from './resources/emails/types'
export type {
  GetEmailInput,
  GetEmailResponse,
  EmailVersionsResponse,
} from './resources/emails/get'
export type {
  DeleteEmailInput,
  DeleteEmailResponse,
} from './resources/emails/delete'
export type {
  RestoreEmailInput,
  RestoreEmailResponse,
} from './resources/emails/restore'
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
