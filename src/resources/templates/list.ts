import type { operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { TemplatesListResponse } from './types'

export type ListTemplatesInput =
  operations['listTemplates']['parameters']['query']
export type ListTemplatesResponse = TemplatesListResponse

export type { TemplatesListResponse }

/**
 * `GET /v1/templates` — list public email templates (scope: `emails`).
 *
 * Returns the uniform `{ data, pagination }` envelope. Each `data` row is a
 * lean reference (`{ emailId }`); call `get(emailId)` for `html` +
 * `previewImage`. Supports exact `brand`/`category` filters, a lightweight
 * `semantic` text filter, plus `limit`/`cursor` pagination. Templates are
 * organization-wide references (use one as `referenceEmailId` on
 * `POST /v1/emails`).
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ListTemplatesResponse>` instead of the unwrapped
 * envelope.
 */
export function createListTemplates(client: HttpClient) {
  function listTemplates(
    input: ListTemplatesInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListTemplatesResponse>>
  function listTemplates(
    input?: ListTemplatesInput,
    options?: RequestOptions
  ): Promise<ListTemplatesResponse>
  async function listTemplates(
    input: ListTemplatesInput = {},
    options?: RequestOptions
  ): Promise<ListTemplatesResponse | BrewRawResponse<ListTemplatesResponse>> {
    const response = await client.request<ListTemplatesResponse>({
      method: 'GET',
      path: '/v1/templates',
      query: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listTemplates
}
