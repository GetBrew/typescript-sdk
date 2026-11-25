import type { components } from '../../generated/openapi-types'

export type IntegrationsListResponse =
  components['schemas']['IntegrationsListResponse']

export type Integration = IntegrationsListResponse['data'][number]
