import type { components } from '../../generated/openapi-types'

/**
 * Envelope returned by `GET /v1/integrations` — the full provider
 * catalog for the brand in scope, `{ data }` (unpaginated).
 */
export type IntegrationsListResponse =
  components['schemas']['IntegrationsListResponse']

/**
 * One row of the integration catalog: a `provider`, its display `name`,
 * `category` (`data_in` | `data_out`), whether the brand has it
 * `connected`, and an optional `comingSoon` flag for providers not yet
 * live. Connecting a provider is a human Settings hop at
 * `/integrations/{provider}` — never construct or paste a connect URL.
 */
export type Integration = IntegrationsListResponse['data'][number]

/**
 * A hosted auth email hook Brew can connect: `supabase_auth` (the Supabase
 * Auth Send Email Hook) or `clerk` (Clerk webhooks, whose `email.created`
 * events carry the auth emails).
 */
export type IntegrationConnectionProvider =
  components['schemas']['IntegrationConnection']['provider']

/**
 * A brand's hosted auth hook connection, from
 * `GET /v1/integrations/{provider}/connection`: the `connectionId` (stable
 * per brand and provider), the `webhookUrl` to paste into the provider,
 * and `status` (`pending_verification` until the first signed delivery,
 * then `active`).
 */
export type IntegrationConnection =
  components['schemas']['IntegrationConnection']

/**
 * Body of `PUT /v1/integrations/{provider}/connection`: the provider's
 * `signingSecret` (Supabase `v1,whsec_…`, Clerk `whsec_…`) and, for
 * Supabase only, `settings.projectUrl`.
 */
export type IntegrationConnectionBody =
  components['schemas']['IntegrationConnectionPutRequest']

/**
 * What a connect returns: the connection plus `authEmails`, one row per
 * auth key the provider sends.
 */
export type IntegrationConnectionResult =
  components['schemas']['IntegrationConnectionPutResponse']

/**
 * One auth key a connect set up (or kept): `ok: true`, or `ok: false` with
 * its `error` (`code`, `message`). Connecting again finishes a failed key.
 */
export type IntegrationConnectionAuthEmail =
  IntegrationConnectionResult['authEmails'][number]
