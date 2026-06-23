import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { TemplateDetail } from './types'

export type GetTemplateInput = {
  /**
   * Template id from `GET /v1/templates` (the `emailId` on each list
   * row). Templates are organization-wide; unknown ids surface as
   * `404 TEMPLATE_NOT_FOUND`.
   */
  readonly emailId: string
}

/** A single template with rendered `html` + `previewImage`. */
export type GetTemplateResponse = TemplateDetail

export type { TemplateDetail }

/**
 * `GET /v1/templates/{emailId}` — fetch one public template with its
 * rendered `html` and `previewImage` (scope: `emails`).
 *
 * The `emailId` is sent on the URL. Cross-brand or unknown ids surface
 * as `404 TEMPLATE_NOT_FOUND`. Use the returned `emailId` as
 * `referenceEmailId` on `POST /v1/emails`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetTemplateResponse>` instead of the unwrapped
 * payload.
 */
export function createGetTemplate(client: HttpClient) {
  function getTemplate(
    input: GetTemplateInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetTemplateResponse>>
  function getTemplate(
    input: GetTemplateInput,
    options?: RequestOptions
  ): Promise<GetTemplateResponse>
  async function getTemplate(
    input: GetTemplateInput,
    options?: RequestOptions
  ): Promise<GetTemplateResponse | BrewRawResponse<GetTemplateResponse>> {
    const response = await client.request<GetTemplateResponse>({
      method: 'GET',
      path: `/v1/templates/${encodeURIComponent(input.emailId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getTemplate
}
