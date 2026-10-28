import type { components, operations } from '../../../generated/openapi-types'

/**
 * Domain types for `brew.integrations.events.*`
 * (`GET /v1/integrations/events`, `GET /v1/integrations/events/{eventId}`):
 * the events a brand's connected live sources offer as automation triggers
 * (a PostHog project's own events; the Stripe and Shopify app catalogs).
 */

/** The page `GET /v1/integrations/events` returns: `{ data, sources, pagination }`. */
export type IntegrationEventsListResponse =
  components['schemas']['IntegrationEventsListResponse']

/**
 * One live event: its `eventId` (pass it to `get` and to
 * `automations.triggers.ensureIntegrationEvent`), the provider's `eventKey`,
 * Brew's `label` and lifecycle `stage`, its `modelRoles`, `volume30d`, and
 * its `triggerEventId` once it is a trigger.
 */
export type IntegrationEvent = IntegrationEventsListResponse['data'][number]

/**
 * One connected source the page drew from: its `mode` (`static_catalog` for
 * an app catalog, `tenant_catalog` for an account's own events),
 * `definitionCount`, and `isTruncated` when the provider listed more events
 * than Brew keeps.
 */
export type IntegrationEventSource =
  IntegrationEventsListResponse['sources'][number]

/** `standard` | `custom` | `action` | `derived` | `observed`. */
export type IntegrationEventKind = IntegrationEvent['kind']

/** The lifecycle stage Brew inferred (a brand member's correction wins). */
export type IntegrationEventStage = NonNullable<IntegrationEvent['stage']>

/**
 * One live event in full, as `GET /v1/integrations/events/{eventId}` returns
 * it: the list row's fields plus `description`, `derivedFromKey` and
 * `properties`.
 */
export type IntegrationEventDetail =
  components['schemas']['IntegrationEventDetailResponse']

/**
 * One property of an event: its template `variable` (use it as
 * `{{ <variable> | fallback }}`), `scope` (`event` or `person`), `type`,
 * `isPersonal` (never put it in a subject) and `isPersonalization` (Brew
 * suggests it to personalize an email).
 */
export type IntegrationEventProperty =
  IntegrationEventDetail['properties'][number]

/** The generated query `GET /v1/integrations/events` takes. */
export type ListIntegrationEventsQuery = NonNullable<
  operations['listIntegrationEvents']['parameters']['query']
>
