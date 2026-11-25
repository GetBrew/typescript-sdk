import type { components, operations } from '../../../generated/openapi-types'

export type IntegrationEventsListResponse =
  components['schemas']['IntegrationEventsListResponse']

export type IntegrationEvent = IntegrationEventsListResponse['data'][number]

export type IntegrationEventSource =
  IntegrationEventsListResponse['sources'][number]

export type IntegrationEventKind = IntegrationEvent['kind']

export type IntegrationEventStage = NonNullable<IntegrationEvent['stage']>

export type IntegrationEventDetail =
  components['schemas']['IntegrationEventDetailResponse']

export type IntegrationEventPropertiesStatus =
  IntegrationEventDetail['propertiesStatus']

export type IntegrationEventProperty =
  IntegrationEventDetail['properties'][number]

export type ListIntegrationEventsQuery = NonNullable<
  operations['listIntegrationEvents']['parameters']['query']
>
