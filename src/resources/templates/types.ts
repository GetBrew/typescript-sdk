import type { components, operations } from '../../generated/openapi-types'

export type TemplatesListResponse =
  components['schemas']['TemplatesListResponse']

export type Template = TemplatesListResponse['data'][number]

type TemplatesListBody =
  operations['listTemplates']['responses'][200]['content']['application/json']

export type TemplatesCountResponse = Extract<
  TemplatesListBody,
  { count: number }
>

export type TemplateSummaryListResponse = Exclude<
  TemplatesListBody,
  TemplatesListResponse | TemplatesCountResponse
>

export type TemplateSummary = TemplateSummaryListResponse['data'][number]
