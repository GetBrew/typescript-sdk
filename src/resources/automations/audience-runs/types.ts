import type { components } from '../../../generated/openapi-types'

export type AudienceRunsListResponse =
  components['schemas']['AudienceRunsListResponse']
export type AudienceRun = AudienceRunsListResponse['data'][number]
export type AudienceRunControlResponse =
  components['schemas']['AudienceRunControlResponse']
export type AudienceRunControlAction =
  components['schemas']['AudienceRunControlRequest']['action']
