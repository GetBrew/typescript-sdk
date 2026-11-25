import type { components } from '../../generated/openapi-types'

export type FlowsListResponse = components['schemas']['FlowsListResponse']

export type Flow = FlowsListResponse['data'][number]

export type FlowStep = NonNullable<Flow['steps']>[number]
