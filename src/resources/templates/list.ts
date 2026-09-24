import type { operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type {
  TemplatesListResponse,
  TemplateSummaryListResponse,
} from './types'

export type ListTemplatesInput =
  operations['listTemplates']['parameters']['query']
type TemplateFilters = Omit<NonNullable<ListTemplatesInput>, 'representation'>
/** Filters for a page of full rows (the default representation). */
export type ListFullTemplatesInput = TemplateFilters & {
  readonly representation?: 'full'
}
/** Filters for a page of summary rows. */
export type ListTemplateSummariesInput = TemplateFilters & {
  readonly representation: 'summary'
}
export type ListTemplatesResponse = TemplatesListResponse

export type { TemplatesListResponse, TemplateSummaryListResponse }

/**
 * `GET /v1/templates` — list public email templates (scope: `emails`).
 *
 * Returns the uniform `{ data, pagination }` envelope. By default each
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
 * Pass `{ raw: true }` in `options` to receive the full `BrewRawResponse`
 * instead of the unwrapped envelope.
 */
export function createListTemplates(client: HttpClient) {
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
  // A representation only known at runtime gets the union.
  function listTemplates(
    input: ListTemplatesInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<
    BrewRawResponse<TemplatesListResponse | TemplateSummaryListResponse>
  >
  function listTemplates(
    input?: ListTemplatesInput,
    options?: RequestOptions
  ): Promise<TemplatesListResponse | TemplateSummaryListResponse>
  async function listTemplates(
    input: ListTemplatesInput = {},
    options?: RequestOptions
  ): Promise<
    | TemplatesListResponse
    | TemplateSummaryListResponse
    | BrewRawResponse<TemplatesListResponse | TemplateSummaryListResponse>
  > {
    const response = await client.request<
      TemplatesListResponse | TemplateSummaryListResponse
    >({
      method: 'GET',
      path: '/v1/templates',
      query: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listTemplates
}
