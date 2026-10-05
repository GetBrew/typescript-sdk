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

/** The fields accepted for grouped template counts. */
export const TEMPLATE_GROUP_BY_TOKENS = [
  'brand',
  'category',
] as const satisfies ReadonlyArray<NonNullable<TemplateQuery['groupBy']>>

/** Filters for template rows; grouping requires count mode. */
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
/** Matching counts; only grouped counts accept a pagination cursor. */
export type ListTemplateCountsInput = TemplateCountFilters &
  (
    | { readonly groupBy?: never; readonly cursor?: never }
    | {
        readonly groupBy: NonNullable<TemplateQuery['groupBy']>
        readonly cursor?: TemplateQuery['cursor']
      }
  )
/** Query for full rows, summary rows, or template counts. */
export type ListTemplatesInput =
  | ListTemplateRowsInput
  | ListTemplateCountsInput
  | undefined

type TemplateFilters = Omit<ListTemplateRowsInput, 'representation'>
/** Filters for a page of full rows (the default representation). */
export type ListFullTemplatesInput = TemplateFilters & {
  readonly representation?: 'full'
}
/** Filters for a page of summary rows. */
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

/**
 * `GET /v1/templates` — list public email templates.
 * Requires a credential, without a feature scope.
 *
 * Row mode returns `{ data, pagination }`; count mode returns counts. Each
 * `data` row carries the rendered `html` and a `previewImage` (plus
 * `title`/`category`/`brand`/`updatedAt`). Pass
 * `representation: 'summary'` for lean rows without `html` that carry
 * `referenceEmailId` and the gallery `viewUrl` instead; the return type
 * follows the representation you ask for. Supports exact
 * `brand`/`category` filters, a `query` title or identifier match, a
 * `semantic` text ranking, plus `limit`/`cursor` pagination. Templates are
 * organization-wide references (use one as `referenceEmailId` on
 * `POST /v1/emails`); `templates.get(templateId)` reads one.
 *
 * `count: true` returns `{ count }` for the `brand`/`category` filters.
 * `groupBy: 'brand'` or `'category'` adds grouped counts with cursor
 * pagination. Count mode cannot use `query` or `semantic`.
 *
 * Pass `{ raw: true }` in `options` to receive the full `BrewRawResponse`
 * instead of the unwrapped envelope.
 */
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
  // A representation only known at runtime still returns rows.
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
  // A query only known at runtime may return rows or counts.
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
