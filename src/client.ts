import { resolveConfig } from './core/config'
import { createHttpClient, type HttpTuning } from './core/http'
import {
  createAudiencesResource,
  type AudiencesResource,
} from './resources/audiences/resource'
import {
  createContactsResource,
  type ContactsResource,
} from './resources/contacts/resource'
import {
  createFieldsResource,
  type FieldsResource,
} from './resources/fields/resource'
import {
  createDomainsResource,
  type DomainsResource,
} from './resources/domains/resource'
import {
  createEmailsResource,
  type EmailsResource,
} from './resources/emails/resource'
import {
  createSendsResource,
  type SendsResource,
} from './resources/sends/resource'
import {
  createTemplatesResource,
  type TemplatesResource,
} from './resources/templates/resource'
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
  readonly audiences: AudiencesResource
  readonly contacts: ContactsResource
  readonly domains: DomainsResource
  readonly emails: EmailsResource
  readonly fields: FieldsResource
  readonly sends: SendsResource
  readonly templates: TemplatesResource
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
    audiences: createAudiencesResource(httpClient),
    contacts: createContactsResource(httpClient),
    domains: createDomainsResource(httpClient),
    emails: createEmailsResource(httpClient),
    fields: createFieldsResource(httpClient),
    sends: createSendsResource(httpClient),
    templates: createTemplatesResource(httpClient),
  }
}
