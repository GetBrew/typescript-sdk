import {
  createWebhooksResource,
  type WebhooksResource,
} from './resources/webhooks/resource'
import { resolveConfig } from './core/config'
import { createHttpClient, type HttpTuning } from './core/http'
import {
  type AnalyticsResource,
  createAnalyticsResource,
} from './resources/analytics/resource'
import {
  type ApiKeysResource,
  createApiKeysResource,
} from './resources/api-keys/resource'
import {
  type AudiencesResource,
  createAudiencesResource,
} from './resources/audiences/resource'
import {
  type AutomationsResource,
  createAutomationsResource,
} from './resources/automations/resource'
import {
  type BrandResource,
  createBrandResource,
} from './resources/brand/resource'
import {
  type BrandsResource,
  createBrandsResource,
} from './resources/brands/resource'
import {
  type ChatsResource,
  createChatsResource,
} from './resources/chats/resource'
import {
  type ContactsResource,
  createContactsResource,
} from './resources/contacts/resource'
import {
  type ContentResource,
  createContentResource,
} from './resources/content/resource'
import {
  createDomainsResource,
  type DomainsResource,
} from './resources/domains/resource'
import {
  createEmailGroupsResource,
  type EmailGroupsResource,
} from './resources/email-groups/resource'
import {
  createEmailsResource,
  type EmailsResource,
} from './resources/emails/resource'
import {
  createFieldsResource,
  type FieldsResource,
} from './resources/fields/resource'
import {
  createHealthResource,
  type HealthResource,
} from './resources/health/resource'
import {
  createHelpResource,
  type HelpResource,
} from './resources/help/resource'
import {
  createInsightsResource,
  type InsightsResource,
} from './resources/insights/resource'
import {
  createIntegrationsResource,
  type IntegrationsResource,
} from './resources/integrations/resource'
import {
  createNotificationsResource,
  type NotificationsResource,
} from './resources/notifications/resource'
import {
  createPayloadContractsResource,
  type PayloadContractsResource,
} from './resources/payload-contracts/resource'
import {
  createSendsResource,
  type SendsResource,
} from './resources/sends/resource'
import {
  createFlowsResource,
  type FlowsResource,
} from './resources/flows/resource'
import {
  createTemplatesResource,
  type TemplatesResource,
} from './resources/templates/resource'
import {
  createUsageResource,
  type UsageResource,
} from './resources/usage/resource'
import type { BrewClientConfig, ResolvedBrewClientConfig } from './types'
import {
  createCanvasResource,
  type CanvasResource,
} from './resources/canvas/resource'

export type BrewClient = {
  readonly webhooks: WebhooksResource
  readonly canvas: CanvasResource
  readonly withBrand: (brandId: string) => BrewClient
  readonly brands: BrandsResource
  readonly analytics: AnalyticsResource
  readonly apiKeys: ApiKeysResource
  readonly audiences: AudiencesResource
  readonly automations: AutomationsResource
  readonly brand: BrandResource
  readonly chats: ChatsResource
  readonly contacts: ContactsResource
  readonly content: ContentResource
  readonly domains: DomainsResource
  readonly emailGroups: EmailGroupsResource
  readonly emails: EmailsResource
  readonly fields: FieldsResource
  readonly health: HealthResource
  readonly help: HelpResource
  readonly insights: InsightsResource
  readonly integrations: IntegrationsResource
  readonly notifications: NotificationsResource
  readonly sends: SendsResource
  readonly templates: TemplatesResource
  readonly flows: FlowsResource
  readonly payloadContracts: PayloadContractsResource
  readonly usage: UsageResource
}

export function createBrewClient(
  userConfig: BrewClientConfig,
  tuning?: HttpTuning
): BrewClient {
  return buildClient(resolveConfig({ userConfig }), tuning ?? {})
}

function buildClient(
  config: ResolvedBrewClientConfig,
  tuning: HttpTuning
): BrewClient {
  const httpClient = createHttpClient(config, tuning)
  const organizationHttpClient =
    config.brandId === undefined
      ? httpClient
      : createHttpClient({ ...config, brandId: undefined }, tuning)
  return {
    canvas: createCanvasResource(httpClient),
    webhooks: createWebhooksResource(httpClient),
    withBrand: (brandId: string): BrewClient => {
      if (typeof brandId !== 'string' || brandId.trim() === '') {
        throw new TypeError('withBrand: `brandId` must be a non-empty string')
      }
      return buildClient({ ...config, brandId }, tuning)
    },
    brands: createBrandsResource(organizationHttpClient, config.signal),
    analytics: createAnalyticsResource(httpClient),
    apiKeys: createApiKeysResource(organizationHttpClient),
    audiences: createAudiencesResource(httpClient),
    automations: createAutomationsResource(httpClient),
    brand: createBrandResource(httpClient),
    chats: createChatsResource(httpClient),
    contacts: createContactsResource(httpClient),
    content: createContentResource(httpClient),
    domains: createDomainsResource(httpClient),
    emailGroups: createEmailGroupsResource(httpClient),
    emails: createEmailsResource(httpClient),
    fields: createFieldsResource(httpClient),
    health: createHealthResource(organizationHttpClient),
    help: createHelpResource(organizationHttpClient),
    insights: createInsightsResource(httpClient),
    integrations: createIntegrationsResource(httpClient),
    notifications: createNotificationsResource(httpClient),
    sends: createSendsResource(httpClient),
    templates: createTemplatesResource(organizationHttpClient),
    flows: createFlowsResource(organizationHttpClient),
    payloadContracts: createPayloadContractsResource(httpClient),
    usage: createUsageResource(organizationHttpClient),
  }
}
