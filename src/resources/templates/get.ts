import type { operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export const TEMPLATES_INCLUDE_TOKENS = ['html'] as const
export type TemplatesIncludeToken = (typeof TEMPLATES_INCLUDE_TOKENS)[number]

export type GetTemplateOptions = RequestOptions & {
  readonly include?: TemplatesIncludeToken
}

export type GetTemplateResponse =
  operations['getTemplate']['responses'][200]['content']['application/json']

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
