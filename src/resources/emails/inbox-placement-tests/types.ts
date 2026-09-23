import type { components, operations } from '../../../generated/openapi-types'

/**
 * One inbox-placement test. `status` is from the one v1 vocabulary
 * (`queued | running | completed | partially_completed | failed`); the
 * separate `phase` (`sending` | `collecting`) says what a running test
 * is busy with.
 */
export type InboxPlacementTest =
  components['schemas']['EmailInboxPlacementTest']

/** Lifecycle status of an inbox-placement test. */
export type InboxPlacementTestStatus = InboxPlacementTest['status']

/** `{ data, pagination }` envelope of lean rows returned by the list read. */
export type InboxPlacementTestList =
  components['schemas']['EmailInboxPlacementTestList']

/** Body of `POST /v1/emails/{emailId}/inbox-placement-tests`. */
export type CreateInboxPlacementTestBody =
  components['schemas']['EmailInboxPlacementRequest']

/** Pagination knobs accepted by the list read. */
export type ListInboxPlacementTestsQuery = NonNullable<
  operations['listInboxPlacementTests']['parameters']['query']
>
