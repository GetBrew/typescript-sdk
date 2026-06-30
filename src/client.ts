import { resolveConfig } from './core/config'
import { createHttpClient, type HttpTuning } from './core/http'
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
  createChatsResource,
  type ChatsResource,
} from './resources/chats/resource'
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
  createSendsResource,
  type SendsResource,
} from './resources/sends/resource'
import {
  createTemplatesResource,
  type TemplatesResource,
} from './resources/templates/resource'
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
  /**
   * Read-only analytics: campaign + automation KPIs, the unified event
   * explorer, plus the send reads (`analytics.sends.*`) and fired-trigger
   * instances (`analytics.triggerInstances.*`).
   */
  readonly analytics: AnalyticsResource
  readonly audiences: AudiencesResource
  /**
   * Automation graphs plus the nested `automations.triggers.*` (trigger
   * CRUD + fire) and `automations.runs.*` (read-only run history).
   */
  readonly automations: AutomationsResource
  /** `GET/PATCH /v1/brand` — the key's brand: readiness, design system, identity, assets. */
  readonly brand: BrandResource
  /**
   * `GET /v1/chats/{chatId}` (`chats.get`) — a free, read-only
   * brand-scoped digest of a Brew chat (identity, the emails/automations
   * it created/referenced, trigger events, and a trimmed transcript tail)
   * for resuming the conversation in an external agent.
   */
  readonly chats: ChatsResource
  readonly contacts: ContactsResource
  /** `POST /v1/content/*` — credit-metered media generation + image/render ops. */
  readonly content: ContentResource
  readonly domains: DomainsResource
  /**
   * Email designs plus the single polymorphic send action `emails.send`
   * (`POST /v1/sends`): a campaign send by default, or a one-off TEST
   * delivery via `test: true`. A send delivers a saved design to a
   * target. (Send reads live on `analytics.sends.*`.)
   */
  readonly emails: EmailsResource
  readonly fields: FieldsResource
  /** `GET /v1/health` — the no-auth liveness probe (`{ status, version }`). */
  readonly health: HealthResource
  /** `GET /v1/help` — the no-auth machine-readable API catalog. */
  readonly help: HelpResource
  /**
   * Send lifecycle actions. `sends.cancel(sendId)`
   * (`POST /v1/sends/{sendId}/cancel`) cancels a scheduled or queued
   * send before it goes out. (Sends are created via `emails.send`;
   * send reads live on `analytics.sends.*`.)
   */
  readonly sends: SendsResource
  readonly templates: TemplatesResource
  /** `GET /v1/usage` — plan, credit balance, and email-send quota. */
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
 * const found = await brew.contacts.search({
 *   filters: [{ field: 'email', operator: 'equals', value: 'jane@example.com' }],
 * })
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
    analytics: createAnalyticsResource(httpClient),
    audiences: createAudiencesResource(httpClient),
    automations: createAutomationsResource(httpClient),
    brand: createBrandResource(httpClient),
    chats: createChatsResource(httpClient),
    contacts: createContactsResource(httpClient),
    content: createContentResource(httpClient),
    domains: createDomainsResource(httpClient),
    emails: createEmailsResource(httpClient),
    fields: createFieldsResource(httpClient),
    health: createHealthResource(httpClient),
    help: createHelpResource(httpClient),
    sends: createSendsResource(httpClient),
    templates: createTemplatesResource(httpClient),
    usage: createUsageResource(httpClient),
  }
}
