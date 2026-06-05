import type { components, operations } from '../../generated/openapi-types'

/** Envelope returned by `GET /v1/integrations`. */
export type IntegrationsGetResponse =
  components['schemas']['IntegrationsGetResponse']

/** One provider entry in the triggerable-event catalog. */
export type Integration = IntegrationsGetResponse['integrations'][number]

/** A single triggerable event exposed by a provider. */
export type IntegrationEvent = Integration['events'][number]

/** Supported integration provider ids. */
export type IntegrationProvider = Integration['provider']

/** Query params accepted by `brew.integrations.list(...)`. */
export type ListIntegrationsInput = NonNullable<
  operations['listIntegrations']['parameters']['query']
>
