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
export type { UsageResource } from './resources/usage/resource'

// ---------- Nested resource shapes ----------
export type { TriggersResource } from './resources/automations/triggers/resource'
export type { AutomationRunsResource } from './resources/automations/runs/resource'
export type { AnalyticsSendsResource } from './resources/analytics/sends/resource'
export type { AnalyticsTriggerInstancesResource } from './resources/analytics/trigger-instances/resource'

// ---------- New v1 resource domain types ----------
export type * from './resources/content/types'
export type * from './resources/usage/types'

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
  ListAutomationsInput,
  ListAutomationsResponse,
  AutomationsIncludeToken,
} from './resources/automations/list'
export type {
  PatchAutomationInput,
  PatchAutomationResponse,
} from './resources/automations/patch'
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
} from './resources/automations/runs/types'
export type {
  ListAutomationRunsInput,
  ListAutomationRunsResponse,
  AutomationRunsIncludeToken,
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

// ---------- Analytics › sends: the single sends read (+ inline events) ----------
export type {
  Send,
  SendStats,
  SendStatus,
  SendEvent,
  SendsListResponse,
  ListSendsInput,
} from './resources/analytics/sends/types'
export type { ListAllSendsInput } from './resources/analytics/sends/list'

// ---------- Analytics › trigger-instances: fired-trigger history ----------
export type {
  TriggerInstance,
  TriggerInstancesListResponse,
  ListTriggerInstancesInput,
} from './resources/analytics/trigger-instances/types'
export type {
  ListAllTriggerInstancesInput,
  ListTriggerInstancesResponse,
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
// exported from the `analytics/sends` block above; the polymorphic send
// ACTION lives on `emails` (`emails.send` — campaign | test), so its
// request + response shapes are exported from the `emails` block below.
export type { Template } from './resources/templates/types'

// ---------- Audiences: method inputs + outputs ----------
export type {
  ListAudiencesInput,
  ListAudiencesResponse,
  AudiencesIncludeToken,
} from './resources/audiences/list'
export type {
  CreateAudienceInput,
  CreateAudienceResponse,
} from './resources/audiences/create'
export type {
  UpdateAudienceInput,
  UpdateAudienceResponse,
} from './resources/audiences/update'
export type {
  DeleteAudienceInput,
  DeleteAudienceResponse,
} from './resources/audiences/delete'

// ---------- Domains: method inputs + outputs ----------
export type {
  ListDomainsInput,
  ListDomainsResponse,
} from './resources/domains/list'
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
  EmailsIncludeToken,
} from './resources/emails/list'
export type { EmailVersion, EmailDetail } from './resources/emails/types'
export type {
  EmailImportInput,
  EmailImportResponse,
} from './resources/emails/import'
export type {
  DeleteEmailInput,
  DeleteEmailResponse,
} from './resources/emails/delete'
export type {
  RestoreEmailInput,
  RestoreEmailResponse,
} from './resources/emails/restore'
// `POST /v1/sends` is the single polymorphic send (`emails.send`):
// campaign by default, or a one-off TEST delivery via `test: true`.
export type {
  SendEmailInput,
  SendEmailResponse,
  SendEmailTestResponse,
  SendEmailCampaignResponse,
  SendEmailStatus,
} from './resources/emails/send'
// `POST /v1/sends/{sendId}/cancel` is the send lifecycle action
// (`sends.cancel`): cancel a scheduled or queued send before it goes out.
export type {
  SendCancelResponse,
  SendCancelStatus,
} from './resources/sends/cancel'
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
export type { CountContactsInput } from './resources/contacts/count'
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
export type { ContactField, ContactFieldType } from './resources/fields/types'

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
  BrandPatchResponse,
  BrandIdentity,
  BrandLogo,
  BrandIncludeToken,
  UpdateBrandInput,
  BrandImagesResponse,
  ListBrandImagesInput,
} from './resources/brand/types'
export type { GetBrandInput } from './resources/brand/get'

// ---------- Metadata ----------
export { SDK_NAME, SDK_VERSION } from './version'
