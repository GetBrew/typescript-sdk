/**
 * @brew.new/sdk — Official TypeScript SDK for the Brew public API.
 *
 * This is the only file consumers should import from. Anything not
 * re-exported here is private and may change without a major version
 * bump.
 */

// ---------- Client ----------
export { type BrewClient, createBrewClient } from './client'

// ---------- Errors ----------
export { BrewApiError } from './core/errors'
export type { Pagination, PaginationInput } from './core/pagination'
// ---------- Pagination ----------
export { autoPaginate } from './core/pagination'
export type { AutomationAnalyticsInput } from './resources/analytics/automations'
export type { CampaignAnalyticsInput } from './resources/analytics/campaigns'
export type {
  EventsAnalyticsAllInput,
  EventsAnalyticsInput,
} from './resources/analytics/events'
export type {
  AnalyticsOverviewInput,
  AnalyticsOverviewResponse,
} from './resources/analytics/overview'
// ---------- Resource shapes ----------
export type { AnalyticsResource } from './resources/analytics/resource'
export type { ListAllSendsInput } from './resources/analytics/sends/list'
export type { AnalyticsSendsResource } from './resources/analytics/sends/resource'
// ---------- Analytics › sends: the single sends read (+ inline events) ----------
export type {
  ListSendsInput,
  Send,
  SendEvent,
  SendStats,
  SendStatus,
  SendsListResponse,
} from './resources/analytics/sends/types'
export type {
  ListAllTriggerInstancesInput,
  ListTriggerInstancesResponse,
} from './resources/analytics/trigger-instances/list'
export type { AnalyticsTriggerInstancesResource } from './resources/analytics/trigger-instances/resource'
// ---------- Analytics › trigger-instances: fired-trigger history ----------
export type {
  ListTriggerInstancesInput,
  TriggerInstance,
  TriggerInstancesListResponse,
} from './resources/analytics/trigger-instances/types'
// ---------- Analytics: domain types + method outputs ----------
export type {
  AutomationAnalyticsResponse,
  AutomationAnalyticsRow,
  CampaignAnalyticsResponse,
  CampaignAnalyticsRow,
  EventRow,
  EventsAnalyticsResponse,
} from './resources/analytics/types'
export type { ApiKeysResource } from './resources/api-keys/resource'
export type * from './resources/api-keys/types'
export type {
  CreateAudienceInput,
  CreateAudienceResponse,
} from './resources/audiences/create'
export type {
  DeleteAudienceInput,
  DeleteAudienceResponse,
} from './resources/audiences/delete'
export type {
  DuplicateAudienceInput,
  DuplicateAudienceResponse,
} from './resources/audiences/duplicate'
export type {
  AudienceFromEventsInput,
  AudienceFromEventsResponse,
} from './resources/audiences/from-events'
// ---------- Audiences: method inputs + outputs ----------
export type {
  AudiencesIncludeToken,
  ListAudiencesInput,
  ListAudiencesResponse,
} from './resources/audiences/list'
export type { AudiencesResource } from './resources/audiences/resource'
// ---------- Audiences: domain types ----------
export type { Audience } from './resources/audiences/types'
export type {
  UpdateAudienceInput,
  UpdateAudienceResponse,
} from './resources/audiences/update'
export type {
  ControlAudienceRunInput,
  ControlAudienceRunResponse,
} from './resources/automations/audience-runs/control'
export type {
  ListAudienceRunsInput,
  ListAudienceRunsResponse,
} from './resources/automations/audience-runs/list'
export type { AudienceRunsResource } from './resources/automations/audience-runs/resource'
export type {
  AudienceRun,
  AudienceRunControlAction,
  AudienceRunControlResponse,
  AudienceRunsListResponse,
} from './resources/automations/audience-runs/types'
export type {
  AutomationConnectionInput,
  AutomationFilterCondition,
  AutomationFilterNodeConfig,
  AutomationNodeInput,
  AutomationSendEmailNodeConfig,
  AutomationSplitNodeConfig,
  AutomationTriggerNodeConfig,
  AutomationWaitNodeConfig,
  CreateAutomationInput,
  CreateAutomationResponse,
} from './resources/automations/create'
export type {
  DeleteAutomationInput,
  DeleteAutomationResponse,
} from './resources/automations/delete'
export type {
  AutomationsIncludeToken,
  ListAutomationsInput,
  ListAutomationsResponse,
} from './resources/automations/list'
export type {
  PatchAutomationInput,
  PatchAutomationResponse,
} from './resources/automations/patch'
export type { AutomationsResource } from './resources/automations/resource'
export type {
  RunAutomationDryRunResponse,
  RunAutomationInput,
  RunAutomationResponse,
  RunAutomationStartedResponse,
} from './resources/automations/run'
export type {
  AutomationRunsIncludeToken,
  ListAutomationRunsInput,
  ListAutomationRunsResponse,
} from './resources/automations/runs/list'
export type { AutomationRunsResource } from './resources/automations/runs/resource'
// ---------- Automations › runs: read-only run history ----------
// (Exposed as `client.automations.runs.*` against /v1/automations/runs.)
export type {
  AutomationRun,
  AutomationRunLog,
  AutomationRunsListResponse,
} from './resources/automations/runs/types'
export type {
  CreateTriggerInput,
  CreateTriggerResponse,
} from './resources/automations/triggers/create'
export type {
  DeleteTriggerInput,
  DeleteTriggerResponse,
} from './resources/automations/triggers/delete'
export type {
  FireTriggerInput,
  FireTriggerResponse,
} from './resources/automations/triggers/fire'
export type {
  ListTriggersInput,
  ListTriggersResponse,
} from './resources/automations/triggers/list'
export type {
  PatchTriggerInput,
  PatchTriggerResponse,
} from './resources/automations/triggers/patch'
// ---------- Nested resource shapes ----------
export type { TriggersResource } from './resources/automations/triggers/resource'
// ---------- Automations › triggers: domain types ----------
export type {
  Trigger,
  TriggersListResponse,
} from './resources/automations/triggers/types'
// ---------- Automations: domain types ----------
export type {
  Automation,
  AutomationsListResponse,
} from './resources/automations/types'
export type { GetBrandInput } from './resources/brand/get'
export type { BrandResource } from './resources/brand/resource'
// ---------- Brand: domain types + method outputs ----------
export type {
  Brand,
  BrandGetResponse,
  BrandIdentity,
  BrandImagesResponse,
  BrandIncludeToken,
  BrandLogo,
  BrandPatchResponse,
  BrandStatus,
  ListBrandImagesInput,
  UpdateBrandInput,
} from './resources/brand/types'
// ---------- Brand lifecycle: organization discovery + creation ----------
export type {
  CreateBrandInput,
  CreateBrandResponse,
} from './resources/brands/create'
export type {
  GetBrandStatusInput,
  GetBrandStatusResponse,
} from './resources/brands/get'
export type {
  ListBrandsInput,
  ListBrandsResponse,
} from './resources/brands/list'
export type { BrandsResource } from './resources/brands/resource'
export type { ChatsResource } from './resources/chats/resource'
// ---------- Chats: domain types ----------
// (Exposed as `client.chats.get(chatId)` against /v1/chats/{chatId}.)
export type {
  ChatArtifact,
  ChatContextResponse,
  ChatMessage,
} from './resources/chats/types'
// ---------- Contacts: method inputs + outputs ----------
export type { CountContactsInput } from './resources/contacts/count'
export type {
  DeleteContactInput,
  DeleteContactResponse,
} from './resources/contacts/delete'
export type { DeleteManyContactsInput } from './resources/contacts/delete-many'
export type {
  PatchContactInput,
  PatchContactResponse,
} from './resources/contacts/patch'
export type { ContactsResource } from './resources/contacts/resource'
export type {
  SearchContactsInput,
  SearchContactsResponse,
} from './resources/contacts/search'
export type { SearchAllContactsInput } from './resources/contacts/search-all'
// ---------- Contacts: domain types ----------
export type {
  Contact,
  ContactCustomFields,
  ContactsFilter,
} from './resources/contacts/types'
export type {
  UpsertContactInput,
  UpsertContactResponse,
} from './resources/contacts/upsert'
export type {
  UpsertManyContactRow,
  UpsertManyContactsInput,
  UpsertManyContactsResponse,
} from './resources/contacts/upsert-many'
export type { ContentResource } from './resources/content/resource'
// ---------- New v1 resource domain types ----------
export type * from './resources/content/types'
export type { AddDomainInput, AddDomainResponse } from './resources/domains/add'
export type {
  DeleteDomainInput,
  DeleteDomainResponse,
} from './resources/domains/delete'
export type {
  GetDomainHealthInput,
  GetDomainHealthResponse,
} from './resources/domains/health'
// ---------- Domains: method inputs + outputs ----------
export type {
  ListDomainsInput,
  ListDomainsResponse,
} from './resources/domains/list'
export type { DomainsResource } from './resources/domains/resource'
export type {
  UpdateDomainSettingsInput,
  UpdateDomainSettingsResponse,
} from './resources/domains/settings'
export type { Domain } from './resources/domains/types'
export type {
  VerifyDomainInput,
  VerifyDomainResponse,
} from './resources/domains/verify'
export type { EmailGroupsResource } from './resources/email-groups/resource'
export type * from './resources/email-groups/types'
export type {
  EmailClientPreviewResponse,
  PreviewEmailClientsInput,
} from './resources/emails/client-previews'
export { PREVIEW_EMAIL_CLIENTS_DEFAULT_TIMEOUT_MS } from './resources/emails/client-previews'
export type {
  DeleteEmailInput,
  DeleteEmailResponse,
} from './resources/emails/delete'
export type { EditEmailInput, EditEmailResponse } from './resources/emails/edit'
export { EDIT_EMAIL_DEFAULT_TIMEOUT_MS } from './resources/emails/edit'
export type {
  GenerateEmailInput,
  GenerateEmailResponse,
} from './resources/emails/generate'
export { GENERATE_EMAIL_DEFAULT_TIMEOUT_MS } from './resources/emails/generate'
export type {
  EmailImportInput,
  EmailImportResponse,
} from './resources/emails/import'
export type {
  EmailsIncludeToken,
  ListEmailsInput,
  ListEmailsResponse,
} from './resources/emails/list'
export type { EmailsResource } from './resources/emails/resource'
export type {
  RestoreEmailInput,
  RestoreEmailResponse,
} from './resources/emails/restore'
// `POST /v1/sends` is the single polymorphic send (`emails.send`):
// campaign by default, or a one-off TEST delivery via `test: true`.
export type {
  SendEmailCampaignResponse,
  SendEmailInput,
  SendEmailResponse,
  SendEmailStatus,
  SendEmailTestResponse,
} from './resources/emails/send'
export type {
  EmailDetail,
  EmailStatus,
  EmailSummary,
  EmailVersion,
  GeneratedEmailArtifact,
  GeneratedEmailTextResponse,
} from './resources/emails/types'
export type {
  CreateFieldInput,
  CreateFieldResponse,
} from './resources/fields/create'
export type { DeleteFieldInput } from './resources/fields/delete'
// ---------- Fields: method inputs + outputs ----------
export type { ListFieldsResponse } from './resources/fields/list'
export type { FieldsResource } from './resources/fields/resource'
// ---------- Fields: domain types ----------
export type { ContactField, ContactFieldType } from './resources/fields/types'
// ---------- Health + Help: domain types ----------
export type { GetHealthResponse, HealthResponse } from './resources/health/get'
export type { HealthResource } from './resources/health/resource'
export type { GetHelpResponse, HelpResponse } from './resources/help/get'
export type { HelpResource } from './resources/help/resource'
export type { IntegrationsResource } from './resources/integrations/resource'
export type * from './resources/integrations/types'
// `POST /v1/sends/{sendId}/cancel` is the send lifecycle action
// (`sends.cancel`): cancel a scheduled or queued send before it goes out.
export type {
  SendCancelResponse,
  SendCancelStatus,
} from './resources/sends/cancel'
export type { SendsResource } from './resources/sends/resource'
export type {
  ListTemplatesInput,
  ListTemplatesResponse,
} from './resources/templates/list'
export type { TemplatesResource } from './resources/templates/resource'
// Send domain reads (`Send`, `SendStats`, `SendsListResponse`, …) are
// exported from the `analytics/sends` block above; the polymorphic send
// ACTION lives on `emails` (`emails.send` — campaign | test), so its
// request + response shapes are exported from the `emails` block below.
export type { Template } from './resources/templates/types'
export type { TransactionalResource } from './resources/transactional/resource'
export type * from './resources/transactional/types'
export type { UsageResource } from './resources/usage/resource'
export type * from './resources/usage/types'
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

// ---------- Metadata ----------
export { SDK_NAME, SDK_VERSION } from './version'
