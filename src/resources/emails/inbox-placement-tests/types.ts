import type { components, operations } from '../../../generated/openapi-types'

export type InboxPlacementTest =
  components['schemas']['EmailInboxPlacementTest']

export type InboxPlacementTestStatus = InboxPlacementTest['status']

export type InboxPlacementTestList =
  components['schemas']['EmailInboxPlacementTestList']

export type CreateInboxPlacementTestBody =
  components['schemas']['EmailInboxPlacementRequest']

export type ListInboxPlacementTestsQuery = NonNullable<
  operations['listInboxPlacementTests']['parameters']['query']
>
