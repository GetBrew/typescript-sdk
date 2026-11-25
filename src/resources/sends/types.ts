import type { components, operations } from '../../generated/openapi-types'

export type SendsListResponse = components['schemas']['SendsListResponse']

export type Send = components['schemas']['Send']

export type SendStats = NonNullable<Send['stats']>

export type SendStatus = Send['status']

export type SendEvent = components['schemas']['SendEvent']

export type ListSendsInput = NonNullable<
  operations['listSends']['parameters']['query']
>
