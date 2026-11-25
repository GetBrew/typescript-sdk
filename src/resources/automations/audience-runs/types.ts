import type { components, operations } from '../../../generated/openapi-types'

export type AudienceRunsListResponse =
  components['schemas']['AudienceRunsListResponse']

export type AudienceRun = components['schemas']['AudienceRun']

export type AudienceRunActionResponse =
  components['schemas']['AudienceRunActionResponse']

export type ListAudienceRunsInput = NonNullable<
  operations['listAudienceRuns']['parameters']['query']
>
