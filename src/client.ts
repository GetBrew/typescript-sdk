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
  createDataResource,
  type DataResource,
} from './resources/data/resource'
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
  createIntegrationsResource,
  type IntegrationsResource,
} from './resources/integrations/resource'
import {
  createPayloadContractsResource,
  type PayloadContractsResource,
} from './resources/payload-contracts/resource'
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
import type { BrewClientConfig, ResolvedBrewClientConfig } from './types'

/**
 * The public shape of a Brew API client. Expand this union as new
 * resource modules land — the only place that has to change is here plus
 * the wire-up in `createBrewClient`.
 *
 * A client can be pinned to ONE brand at a time. A brand-scoped key resolves
 * its own; an ORGANIZATION-scoped key names one for brand-scoped resources —
 * set `brandId` in the config, or use `withBrand()` to pin one. Organization-
 * level resources (`brands`, `templates`, `usage`, and `apiKeys`) never send
 * that pin.
 */
export type BrewClient = {
  /**
   * Return a client pinned to `brandId` (sent as `X-Brand-Id`). Same auth,
   * transport and tuning; only the brand differs. Use this with an
   * ORGANIZATION-scoped key to work across brands without rebuilding a client.
   */
  readonly withBrand: (brandId: string) => BrewClient
  /**
   * Brand LIFECYCLE (`/v1/brands`) — list, create, and poll brands. This
   * organization-level resource takes no brand selector. It is distinct from
   * `brand` (singular), which reads the active brand's design context.
   */
  readonly brands: BrandsResource
  /**
   * Read-only analytics: campaign + automation KPIs, the unified event
   * explorer, plus the send reads (`analytics.sends.*`) and fired-trigger
   * instances (`analytics.triggerInstances.*`).
   */
  readonly analytics: AnalyticsResource
  /**
   * Organization-level API key lifecycle. `apiKeys.list()` (`GET
   * /v1/api-keys`), `apiKeys.create(...)` (`POST /v1/api-keys` — the
   * plaintext `key` is returned once), and `apiKeys.revoke({ keyId })`
   * (`DELETE /v1/api-keys/{keyId}`). Never sends `X-Brand-Id`.
   */
  readonly apiKeys: ApiKeysResource
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
  /** `POST /v1/data` — the unified `db …` command surface over brand data. */
  readonly data: DataResource
  /** `POST /v1/content/*` — credit-metered media generation + image/render ops. */
  readonly content: ContentResource
  readonly domains: DomainsResource
  /**
   * Named folders for organizing email designs (`emailGroups.list`,
   * `.create`, `.update`, `.delete`). Every design belongs to exactly
   * one group, defaulting to the `ungrouped` sentinel.
   */
  readonly emailGroups: EmailGroupsResource
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
  /** `GET /v1/integrations` — the product integration catalog for the brand in scope, with a `connected` flag per provider. */
  readonly integrations: IntegrationsResource
  /**
   * Send lifecycle actions. `sends.cancel(sendId)`
   * (`POST /v1/sends/{sendId}/cancel`) cancels a scheduled or queued
   * send before it goes out. (Sends are created via `emails.send`;
   * send reads live on `analytics.sends.*`.)
   */
  readonly sends: SendsResource
  readonly templates: TemplatesResource
  /**
   * Payload-contract helpers.
   * `payloadContracts.infer(example)` drafts an unsaved contract from a
   * real example payload; declare it with
   * `automations.triggers.putContract`.
   */
  readonly payloadContracts: PayloadContractsResource
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
  return buildClient(resolveConfig({ userConfig }), tuning ?? {})
}

/**
 * Assemble a client from an ALREADY-resolved config.
 *
 * Both `createBrewClient` and `withBrand` route through here. `withBrand`
 * must not re-run `resolveConfig` — that would re-derive defaults from the
 * user's original input and silently drop the `tuning` the caller passed,
 * so a pinned client would quietly stop honouring its retry/timeout setup.
 */
function buildClient(
  config: ResolvedBrewClientConfig,
  tuning: HttpTuning
): BrewClient {
  const httpClient = createHttpClient(config, tuning)
  // Scope-neutral resources never accept X-Brand-Id. Reuse the base transport
  // when unpinned; otherwise construct one from the same immutable config with
  // the pin removed so `withBrand()` cannot leak its header into organization
  // discovery, templates, billing, or public service metadata.
  const organizationHttpClient =
    config.brandId === undefined
      ? httpClient
      : createHttpClient({ ...config, brandId: undefined }, tuning)
  return {
    withBrand: (brandId: string): BrewClient => {
      if (typeof brandId !== 'string' || brandId.trim() === '') {
        throw new TypeError('withBrand: `brandId` must be a non-empty string')
      }
      return buildClient({ ...config, brandId }, tuning)
    },
    brands: createBrandsResource(organizationHttpClient),
    analytics: createAnalyticsResource(httpClient),
    apiKeys: createApiKeysResource(organizationHttpClient),
    audiences: createAudiencesResource(httpClient),
    automations: createAutomationsResource(httpClient),
    brand: createBrandResource(httpClient),
    chats: createChatsResource(httpClient),
    contacts: createContactsResource(httpClient),
    data: createDataResource(httpClient),
    content: createContentResource(httpClient),
    domains: createDomainsResource(httpClient),
    emailGroups: createEmailGroupsResource(httpClient),
    emails: createEmailsResource(httpClient),
    fields: createFieldsResource(httpClient),
    health: createHealthResource(organizationHttpClient),
    help: createHelpResource(organizationHttpClient),
    integrations: createIntegrationsResource(httpClient),
    sends: createSendsResource(httpClient),
    templates: createTemplatesResource(organizationHttpClient),
    payloadContracts: createPayloadContractsResource(httpClient),
    usage: createUsageResource(organizationHttpClient),
  }
}
