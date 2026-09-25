import type { operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/** The expansion `GET /v1/templates/{templateId}` accepts. */
export const TEMPLATES_INCLUDE_TOKENS = ['html'] as const
export type TemplatesIncludeToken = (typeof TEMPLATES_INCLUDE_TOKENS)[number]

/** `include: 'html'` adds the template's rendered HTML. */
export type GetTemplateOptions = RequestOptions & {
  readonly include?: TemplatesIncludeToken
}

/** One public template: metadata, preview and links, optional content. */
export type GetTemplateResponse =
  operations['getTemplate']['responses'][200]['content']['application/json']

/**
 * `GET /v1/templates/{templateId}` — one public template with its
 * `previewImage`, `viewUrl` and the `referenceEmailId` that
 * `brew.emails.generate({ referenceEmailId })` remixes. Pass
 * `include: 'html'` for its rendered HTML; large HTML arrives as a
 * downloadable `content.url` instead of inline. An unknown id is
 * `404 TEMPLATE_NOT_FOUND`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetTemplateResponse>` instead of the unwrapped row.
 */
export function createGetTemplate(client: HttpClient) {
  function getTemplate(
    templateId: string,
    options: GetTemplateOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetTemplateResponse>>
  function getTemplate(
    templateId: string,
    options?: GetTemplateOptions
  ): Promise<GetTemplateResponse>
  async function getTemplate(
    templateId: string,
    options?: GetTemplateOptions
  ): Promise<GetTemplateResponse | BrewRawResponse<GetTemplateResponse>> {
    const response = await client.request<GetTemplateResponse>({
      method: 'GET',
      path: `/v1/templates/${encodeURIComponent(templateId)}`,
      ...(options?.include !== undefined
        ? { query: { include: options.include } }
        : {}),
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getTemplate
}
