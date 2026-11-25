import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ContentHtmlToPngRequest, ContentPngResponse } from './types'

export type { ContentHtmlToPngRequest, ContentPngResponse }

export function createHtmlToPng(client: HttpClient) {
  function htmlToPng(
    input: ContentHtmlToPngRequest,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ContentPngResponse>>
  function htmlToPng(
    input: ContentHtmlToPngRequest,
    options?: RequestOptions
  ): Promise<ContentPngResponse>
  async function htmlToPng(
    input: ContentHtmlToPngRequest,
    options?: RequestOptions
  ): Promise<ContentPngResponse | BrewRawResponse<ContentPngResponse>> {
    const response = await client.request<ContentPngResponse>({
      method: 'POST',
      path: '/v1/content/html-to-png',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return htmlToPng
}
