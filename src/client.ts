import { resolveConfig } from './core/config'
import { createHttpClient, type HttpTuning } from './core/http'
import {
  createAccountResource,
  type AccountResource,
} from './resources/account/resource'
import {
  createAnalyticsResource,
  type AnalyticsResource,
} from './resources/analytics/resource'
import {
  createAudiencesResource,
  type AudiencesResource,
} from './resources/audiences/resource'
import {
  createAutomationsResource,
  type AutomationsResource,
} from './resources/automations/resource'
import {
  createBrandResource,
  type BrandResource,
} from './resources/brand/resource'
import {
  createContactsResource,
  type ContactsResource,
} from './resources/contacts/resource'
import {
  createContentResource,
  type ContentResource,
} from './resources/content/resource'
import {
  createDomainsResource,
  type DomainsResource,
} from './resources/domains/resource'
import {
  createEmailsResource,
  type EmailsResource,
} from './resources/emails/resource'
import {
  createAutomationRunsResource,
  type AutomationRunsResource,
} from './resources/automation-runs/resource'
import {
  createFieldsResource,
  type FieldsResource,
} from './resources/fields/resource'
import {
  createIntegrationsResource,
  type IntegrationsResource,
} from './resources/integrations/resource'
import {
  createMeResource,
  type MeResource,
} from './resources/me/resource'
import {
  createSendsResource,
  type SendsResource,
} from './resources/sends/resource'
import {
  createTemplatesResource,
  type TemplatesResource,
} from './resources/templates/resource'
import {
  createTriggersResource,
  type TriggersResource,
} from './resources/triggers/resource'
import {
  createUsageResource,
  type UsageResource,
} from './resources/usage/resource'
import type { BrewClientConfig } from './types'

/**
 * The public shape of a Brew API client. Expand this union as new
 * resource modules land — the only place that has to change is here plus
 * the wire-up in `createBrewClient`.
 *
 * Note: there is no `brands` resource. The Brew public API does not
 * expose brand management. The single brand bound to your API key is
 * the only brand the public API can act on; it is selected when the
 * key is created in the dashboard.
 */
export type BrewClient = {
  /** `GET /v1/account` — plan, credit balance, and email-send quota. */
  readonly account: AccountResource
  /** Read-only campaign + automation analytics + the unified event explorer. */
  readonly analytics: AnalyticsResource
  readonly audiences: AudiencesResource
  readonly automations: AutomationsResource
  /** Canonical surface for trigger fires / automation tests / replays / cancels. */
  readonly automationRuns: AutomationRunsResource
  /** `GET/PUT /v1/brand/*` — the key's brand: readiness, design system, identity, assets. */
  readonly brand: BrandResource
  readonly contacts: ContactsResource
  /** `POST /v1/content/*` — credit-metered media generation + image/render ops. */
  readonly content: ContentResource
  readonly domains: DomainsResource
  readonly emails: EmailsResource
  readonly fields: FieldsResource
  /** `GET /v1/integrations` — triggerable integration-event catalog. */
  readonly integrations: IntegrationsResource
  /** `GET /v1/me` — the API key's identity, brand, and granted scopes. */
  readonly me: MeResource
  readonly sends: SendsResource
  readonly templates: TemplatesResource
  readonly triggers: TriggersResource
  /** `GET /v1/usage` — API request volume + success/error trend. */
  readonly usage: UsageResource
}

/**
 * Build a Brew API client.
 *
 * This is the single public entrypoint users call. It resolves the
 * client config (applying defaults, validating the API key), constructs
 * the shared HTTP transport, and then stitches every resource onto that
 * transport so each resource closes over the same auth/retry/timeout
 * settings.
 *
 * ```ts
 * const brew = createBrewClient({
 *   apiKey: process.env.BREW_API_KEY!,
 * })
 *
 * const contact = await brew.contacts.getByEmail({ email: 'jane@example.com' })
 * ```
 *
 * The second `tuning` parameter is INTERNAL and exists only so the SDK's
 * own test suite can run the retry loop at full speed. It is not part of
 * the supported public API and should not appear in user-facing docs or
 * examples. If you find yourself needing it outside of tests, that is a
 * sign the real `BrewClientConfig` should grow a new knob instead.
 */
export function createBrewClient(
  userConfig: BrewClientConfig,
  tuning?: HttpTuning
): BrewClient {
  const config = resolveConfig({ userConfig })
  const httpClient = createHttpClient(config, tuning ?? {})
  return {
    account: createAccountResource(httpClient),
    analytics: createAnalyticsResource(httpClient),
    audiences: createAudiencesResource(httpClient),
    automations: createAutomationsResource(httpClient),
    automationRuns: createAutomationRunsResource(httpClient),
    brand: createBrandResource(httpClient),
    contacts: createContactsResource(httpClient),
    content: createContentResource(httpClient),
    domains: createDomainsResource(httpClient),
    emails: createEmailsResource(httpClient),
    fields: createFieldsResource(httpClient),
    integrations: createIntegrationsResource(httpClient),
    me: createMeResource(httpClient),
    sends: createSendsResource(httpClient),
    templates: createTemplatesResource(httpClient),
    triggers: createTriggersResource(httpClient),
    usage: createUsageResource(httpClient),
  }
}
