import type { operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type {
  TemplatesListResponse,
  TemplateSummaryListResponse,
  TemplatesCountResponse,
} from './types'

type TemplateQuery = NonNullable<
  operations['listTemplates']['parameters']['query']
>

export const TEMPLATE_GROUP_BY_TOKENS = [
  'brand',
  'category',
  'group',
] as const satisfies ReadonlyArray<NonNullable<TemplateQuery['groupBy']>>

export type ListTemplateRowsInput = Omit<TemplateQuery, 'count' | 'groupBy'> & {
  readonly count?: false | 'false'
  readonly groupBy?: never
}
type TemplateCountFilters = Omit<
  TemplateQuery,
  'count' | 'semantic' | 'query' | 'cursor' | 'groupBy'
> & {
  readonly count: true | 'true'
  readonly semantic?: never
  readonly query?: never
}
export type ListTemplateCountsInput = TemplateCountFilters &
  (
    | { readonly groupBy?: never; readonly cursor?: never }
    | {
        readonly groupBy: NonNullable<TemplateQuery['groupBy']>
        readonly cursor?: TemplateQuery['cursor']
      }
  )
export type ListTemplatesInput =
  | ListTemplateRowsInput
  | ListTemplateCountsInput
  | undefined

type TemplateFilters = Omit<ListTemplateRowsInput, 'representation'>
export type ListFullTemplatesInput = TemplateFilters & {
  readonly representation?: 'full'
}
export type ListTemplateSummariesInput = TemplateFilters & {
  readonly representation: 'summary'
}
export type ListTemplatesResponse = TemplatesListResponse
export type {
  TemplatesListResponse,
  TemplateSummaryListResponse,
  TemplatesCountResponse,
}

type ListTemplatesBody =
  | TemplatesListResponse
  | TemplateSummaryListResponse
  | TemplatesCountResponse

export function createListTemplates(client: HttpClient) {
  function listTemplates(
    input: ListTemplateCountsInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<TemplatesCountResponse>>
  function listTemplates(
    input: ListTemplateCountsInput,
    options?: RequestOptions
  ): Promise<TemplatesCountResponse>
  function listTemplates(
    input: ListTemplateSummariesInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<TemplateSummaryListResponse>>
  function listTemplates(
    input: ListTemplateSummariesInput,
    options?: RequestOptions
  ): Promise<TemplateSummaryListResponse>
  function listTemplates(
    input: ListFullTemplatesInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<TemplatesListResponse>>
  function listTemplates(
    input?: ListFullTemplatesInput,
    options?: RequestOptions
  ): Promise<TemplatesListResponse>
  function listTemplates(
    input: ListTemplateRowsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<
    BrewRawResponse<TemplatesListResponse | TemplateSummaryListResponse>
  >
  function listTemplates(
    input?: ListTemplateRowsInput,
    options?: RequestOptions
  ): Promise<TemplatesListResponse | TemplateSummaryListResponse>
  function listTemplates(
    input: ListTemplatesInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListTemplatesBody>>
  function listTemplates(
    input?: ListTemplatesInput,
    options?: RequestOptions
  ): Promise<ListTemplatesBody>
  async function listTemplates(
    input: ListTemplatesInput = {},
    options?: RequestOptions
  ): Promise<ListTemplatesBody | BrewRawResponse<ListTemplatesBody>> {
    const response = await client.request<ListTemplatesBody>({
      method: 'GET',
      path: '/v1/templates',
      query: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listTemplates
}
