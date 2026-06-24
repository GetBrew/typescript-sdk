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

// ---------- Pagination ----------
export { autoPaginate } from './core/pagination'
export type { Pagination, PaginationInput } from './core/pagination'

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
export type { AccountResource } from './resources/account/resource'
export type { AnalyticsResource } from './resources/analytics/resource'
export type { AudiencesResource } from './resources/audiences/resource'
export type { AutomationsResource } from './resources/automations/resource'
export type { BrandResource } from './resources/brand/resource'
export type { ContactsResource } from './resources/contacts/resource'
export type { ContentResource } from './resources/content/resource'
export type { DomainsResource } from './resources/domains/resource'
export type { EmailsResource } from './resources/emails/resource'
export type { FieldsResource } from './resources/fields/resource'
export type { HelpResource } from './resources/help/resource'
export type { SendsResource } from './resources/sends/resource'
export type { TemplatesResource } from './resources/templates/resource'

// ---------- Nested resource shapes ----------
export type { TriggersResource } from './resources/automations/triggers/resource'
export type { AutomationRunsResource } from './resources/automations/runs/resource'
export type { AnalyticsSendsResource } from './resources/analytics/sends/resource'
export type { AnalyticsTriggerInstancesResource } from './resources/analytics/trigger-instances/resource'

// ---------- New v1 resource domain types ----------
export type * from './resources/account/types'
export type * from './resources/content/types'

// ---------- Help: domain types ----------
export type { HelpResponse, GetHelpResponse } from './resources/help/get'

// ---------- Automations › triggers: domain types ----------
export type {
  Trigger,
  TriggersListResponse,
} from './resources/automations/triggers/types'
export type {
  CreateTriggerInput,
  CreateTriggerResponse,
} from './resources/automations/triggers/create'
export type {
  GetTriggerInput,
  GetTriggerResponse,
  ListTriggersInput,
  ListTriggersResponse,
} from './resources/automations/triggers/list'
export type {
  PatchTriggerInput,
  PatchTriggerResponse,
} from './resources/automations/triggers/patch'
export type {
  DeleteTriggerInput,
  DeleteTriggerResponse,
} from './resources/automations/triggers/delete'
export type {
  FireTriggerInput,
  FireTriggerResponse,
} from './resources/automations/triggers/fire'

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
  ListAutomationsInput,
  ListAutomationsResponse,
} from './resources/automations/list'
export type {
  PatchAutomationInput,
  PatchAutomationResponse,
} from './resources/automations/patch'
export type {
  ListAutomationVersionsInput,
  AutomationVersionsResponse,
} from './resources/automations/versions'
export type {
  DeleteAutomationInput,
  DeleteAutomationResponse,
} from './resources/automations/delete'

// ---------- Automations › runs: read-only run history ----------
// (Exposed as `client.automations.runs.*` against /v1/automations/runs.)
export type {
  AutomationRun,
  AutomationRunLog,
  AutomationRunsListResponse,
  AutomationRunDetailResponse,
} from './resources/automations/runs/types'
export type {
  ListAutomationRunsInput,
  ListAutomationRunsResponse,
  GetAutomationRunInput,
  GetAutomationRunResponse,
} from './resources/automations/runs/list'

// ---------- Analytics: domain types + method outputs ----------
export type {
  CampaignAnalyticsResponse,
  CampaignAnalyticsRow,
  AutomationAnalyticsResponse,
  AutomationAnalyticsRow,
  EventsAnalyticsResponse,
  EventRow,
} from './resources/analytics/types'
export type { AutomationAnalyticsInput } from './resources/analytics/automations'
export type { CampaignAnalyticsInput } from './resources/analytics/campaigns'
export type {
  EventsAnalyticsInput,
  EventsAnalyticsAllInput,
} from './resources/analytics/events'

// ---------- Analytics › sends: send reads + per-recipient event feeds ----------
export type {
  Send,
  SendStats,
  SendStatus,
  SendEvent,
  SendsListResponse,
  SendEventsResponse,
  ListSendsInput,
  ListEmailSendsInput,
  ListSendEventsInput,
} from './resources/analytics/sends/types'
export type { ListAllSendsInput } from './resources/analytics/sends/list'
export type {
  GetSendInput,
  GetSendResponse,
} from './resources/analytics/sends/get'
export type {
  ListSendEventsForSendInput,
  ListAllSendEventsInput,
} from './resources/analytics/sends/list-events'
export type {
  ListSendsForEmailInput,
  ListAllSendsForEmailInput,
} from './resources/analytics/sends/list-for-email'

// ---------- Analytics › trigger-instances: fired-trigger history ----------
export type {
  TriggerInstance,
  TriggerInstanceDetail,
  TriggerInstancesListResponse,
  ListTriggerInstancesInput,
} from './resources/analytics/trigger-instances/types'
export type {
  ListAllTriggerInstancesInput,
  ListTriggerInstancesResponse,
  GetTriggerInstanceInput,
  GetTriggerInstanceResponse,
} from './resources/analytics/trigger-instances/list'

// ---------- Audiences: domain types ----------
export type { Audience } from './resources/audiences/types'
export type { Domain } from './resources/domains/types'
export type {
  EmailStatus,
  EmailSummary,
  GeneratedEmailArtifact,
  GeneratedEmailTextResponse,
} from './resources/emails/types'
// Send domain reads (`Send`, `SendStats`, `SendsListResponse`, …) are
// exported from the `analytics/sends` block above; the top-level `sends`
// resource keeps only the create + test request/response shapes.
export type {
  SendAcceptedResponse,
  SendAcceptedStatus,
  SendsPostRequest,
  SendsTestResponse,
} from './resources/sends/types'
export type { Template } from './resources/templates/types'

// ---------- Audiences: method inputs + outputs ----------
export type {
  ListAudiencesInput,
  ListAudiencesResponse,
} from './resources/audiences/list'
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
export type {
  ListDomainsInput,
  ListDomainsResponse,
} from './resources/domains/list'
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
export type { TestSendInput, TestSendResponse } from './resources/sends/test'
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
  DeleteContactResponse,
} from './resources/contacts/delete'
export type { DeleteManyContactsInput } from './resources/contacts/delete-many'
export type {
  SearchContactsInput,
  SearchContactsResponse,
} from './resources/contacts/search'
export type { SearchAllContactsInput } from './resources/contacts/search-all'

// ---------- Fields: domain types ----------
export type {
  ContactField,
  ContactFieldType,
} from './resources/fields/types'

// ---------- Fields: method inputs + outputs ----------
export type { ListFieldsResponse } from './resources/fields/list'
export type {
  CreateFieldInput,
  CreateFieldResponse,
} from './resources/fields/create'
export type { DeleteFieldInput } from './resources/fields/delete'

// ---------- Brand: domain types + method outputs ----------
export type {
  Brand,
  BrandStatus,
  BrandGetResponse,
} from './resources/brand/types'

// ---------- Metadata ----------
export { SDK_NAME, SDK_VERSION } from './version'
