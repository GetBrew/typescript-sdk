import type { components, operations } from '../../generated/openapi-types'

/** Envelope returned by `GET /v1/integrations` (`{ data, pagination }`). */
export type IntegrationsGetResponse =
  components['schemas']['IntegrationsGetResponse']

/** One provider entry from the triggerable-event catalog `data[]`. */
export type Integration = IntegrationsGetResponse['data'][number]

/** A single triggerable event exposed by a provider. */
export type IntegrationEvent = Integration['events'][number]

/** Supported integration provider ids. */
export type IntegrationProvider = Integration['provider']

/** Query params accepted by `brew.integrations.list(...)`. */
export type ListIntegrationsInput = NonNullable<
  operations['listIntegrations']['parameters']['query']
>
